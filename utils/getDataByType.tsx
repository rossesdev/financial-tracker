import categories from "../config/categories.json";
import entities from "../config/entities.json";
import typeOfMovements from "../config/typeOfMovements.json";

type TDataType = "categories" | "entities" | "typeOfMovements";

type CategoryData = {
  label: string;
  icon: string;
};

const EMPTY_CATEGORY_DATA: CategoryData = { label: "", icon: "" };

export const getLabelById = (id: string, dataType: TDataType): string => {
  const dataList = getDataByType(dataType);

  if (!dataList) return "";

  const foundItem = dataList.find((item) => item.value === id);
  return foundItem?.name ?? "";
};

export const getCategoryData = (id: string): CategoryData => {
  if (!id) return EMPTY_CATEGORY_DATA;

  const foundCategory = categories.find((category) => category.value === id);
  return foundCategory
    ? { label: foundCategory.name, icon: foundCategory.icon }
    : EMPTY_CATEGORY_DATA;
};

export const getDataByType = (dataType: TDataType) => {
  const dataMap = {
    categories,
    entities,
    typeOfMovements,
  } as const;

  return dataMap[dataType] || null;
};
