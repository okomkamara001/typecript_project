"use client";

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { generatePoemFromImage } from '@/ai/flows/generate-poem-from-image';
import { convertImageUrlToDataUrlAction } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Link as LinkIcon, Copy, Wand2, Loader2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileSchema = z.object({
  imageFile: z
    .custom<FileList>()
    .refine((files) => files && files.length > 0, 'Image is required.')
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => files && ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      '.jpg, .jpeg, .png, .webp and .gif files are accepted.'
    ),
});

const urlSchema = z.object({
  imageUrl: z.string().url('Please enter a valid URL.'),
});

type FileFormValues = z.infer<typeof fileSchema>;
type UrlFormValues = z.infer<typeof urlSchema>;

export default function ImageBardClient() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedPoem, setGeneratedPoem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const { toast } = useToast();

  const fileForm = useForm<FileFormValues>({
    resolver: zodResolver(fileSchema),
  });

  const urlForm = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
  });

  useEffect(() => {
    // Reset poem and error when image changes or tab switches
    setGeneratedPoem(null);
    setError(null);
  }, [imagePreview, activeTab]);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationResult = fileSchema.shape.imageFile.safeParse(files);
      if (!validationResult.success) {
        fileForm.setError('imageFile', {
          type: 'manual',
          message: validationResult.error.errors[0].message,
        });
        setImagePreview(null);
        return;
      }
      fileForm.clearErrors('imageFile');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onUrlSubmit: SubmitHandler<UrlFormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setGeneratedPoem(null); // Clear previous poem
    setImagePreview(null); // Clear previous image preview
    try {
      const result = await convertImageUrlToDataUrlAction(data.imageUrl);
      if (result.success && result.dataUrl) {
        setImagePreview(result.dataUrl);
      } else {
        setError(result.error || 'Failed to load image from URL.');
        toast({ variant: "destructive", title: "Error", description: result.error || 'Failed to load image from URL.' });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMsg);
      toast({ variant: "destructive", title: "Error", description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };
  
  const triggerPoemGeneration = async () => {
    if (!imagePreview) {
      setError('Please upload an image first.');
      toast({ variant: "destructive", title: "Error", description: "Please upload an image first." });
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPoem(null);

    try {
      const result = await generatePoemFromImage({ photoDataUri: imagePreview });
      setGeneratedPoem(result.poem);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to generate poem.';
      setError(errorMsg);
      toast({ variant: "destructive", title: "Error generating poem", description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPoemToClipboard = () => {
    if (generatedPoem) {
      navigator.clipboard.writeText(generatedPoem);
      toast({ title: 'Poem Copied!', description: 'The poem has been copied to your clipboard.' });
    }
  };

  return (
    <Card className="w-full max-w-3xl shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Poem</CardTitle>
        <CardDescription>Choose an image source and let the magic happen.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'file' | 'url')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file"><UploadCloud className="mr-2 h-4 w-4" />Upload File</TabsTrigger>
            <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4" />Image URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="mt-4">
            <form>
              <div className="space-y-2">
                <Label htmlFor="imageFile">Upload Image File</Label>
                <Input
                  id="imageFile"
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="file:text-primary file:font-semibold"
                />
                {fileForm.formState.errors.imageFile && (
                  <p className="text-sm text-destructive">{fileForm.formState.errors.imageFile.message}</p>
                )}
              </div>
            </form>
          </TabsContent>
          <TabsContent value="url" className="mt-4">
            <form onSubmit={urlForm.handleSubmit(onUrlSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  {...urlForm.register('imageUrl')}
                />
                {urlForm.formState.errors.imageUrl && (
                  <p className="text-sm text-destructive">{urlForm.formState.errors.imageUrl.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading && activeTab === 'url' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Load Image from URL
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {imagePreview && (
          <Button onClick={triggerPoemGeneration} disabled={isLoading || !imagePreview} className="w-full mb-6 text-base py-6">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            Generate Poem
          </Button>
        )}

        {(imagePreview || isLoading || generatedPoem || error) && (
          <div className="mt-6 grid gap-6 md:grid-cols-2 items-start">
            <div className="flex flex-col items-center">
              {imagePreview && (
                <div className="w-full aspect-square relative rounded-lg overflow-hidden shadow-md border">
                  <Image src={imagePreview} alt="Uploaded preview" layout="fill" objectFit="cover" data-ai-hint="user uploaded image" />
                </div>
              )}
              {!imagePreview && isLoading && (
                 <Skeleton className="w-full aspect-square rounded-lg" />
              )}
            </div>
            <div className="flex flex-col">
              {isLoading && !generatedPoem && (
                <>
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                </>
              )}
              {error && !isLoading && (
                <div className="text-destructive flex items-center space-x-2 p-4 border border-destructive bg-destructive/10 rounded-md">
                  <AlertTriangle className="h-5 w-5" /> 
                  <p>{error}</p>
                </div>
              )}
              {generatedPoem && !isLoading && (
                <Card className="bg-background/50">
                  <CardHeader>
                    <CardTitle className="font-poem text-xl">Your Poem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-poem whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                      {generatedPoem}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={copyPoemToClipboard} variant="outline" size="sm">
                      <Copy className="mr-2 h-4 w-4" /> Copy Poem
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
