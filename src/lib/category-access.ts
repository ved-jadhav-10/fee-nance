import { toObjectId } from "@/lib/object-id";
import { Category } from "@/models/Category";

export async function resolveAccessibleCategoryId(categoryId: string | null | undefined, userId: string) {
  if (!categoryId) {
    return undefined;
  }

  const categoryObjectId = toObjectId(categoryId);
  const userObjectId = toObjectId(userId);

  const category = await Category.findOne({
    _id: categoryObjectId,
    $or: [{ isSystem: true }, { userId: userObjectId }],
  })
    .select("_id")
    .lean();

  if (!category) {
    throw new Error("Category not found");
  }

  return categoryObjectId;
}
