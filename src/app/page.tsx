import ImageBardClient from '@/components/image-bard/ImageBardClient';
import { Feather } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary/20 rounded-full">
          <Feather size={40} className="text-primary" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Image <span className="text-primary">Bard</span>
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload an image and let AI weave a poetic masterpiece inspired by its essence.
        </p>
      </header>
      <ImageBardClient />
    </div>
  );
}
