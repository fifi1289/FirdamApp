import { RecipeDetailPage } from '@/features/recipes/recipe-detail-page';

export const metadata = { title: 'Recipe' };

export default function RecipePage({ params }: { params: { key: string } }) {
  return <RecipeDetailPage recipeKey={params.key} />;
}
