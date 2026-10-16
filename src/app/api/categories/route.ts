import { handle, ok } from "@/lib/api";
import { listCategories } from "@/services/product.service";

export const GET = handle(async () => ok(await listCategories()));
