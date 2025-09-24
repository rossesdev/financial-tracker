import categories from "../mocks/categories.json";
import paymentMethods from "../mocks/paymentMethods.json";
import typeOfMovements from "../mocks/typeOfMovements.json";

type TDataType = "categories" | "paymentMethods" | "typeOfMovements";

type CategoryData = {
  label: string;
  icon: string;
};

const EMPTY_CATEGORY_DATA: CategoryData = { label: "", icon: "" };

export const getLabelById = (id: string, dataType: TDataType): string => {
  const dataList = getDataByType(dataType);

  if (!dataList) return "";

  const foundItem = dataList.find((item) => item.id === id);
  return foundItem?.label ?? "";
};

export const getCategoryData = (id: string): CategoryData => {
  if (!id) return EMPTY_CATEGORY_DATA;

  const foundCategory = categories.find((category) => category.id === id);
  return foundCategory
    ? { label: foundCategory.label, icon: foundCategory.icon }
    : EMPTY_CATEGORY_DATA;
};

export const getDataByType = (dataType: TDataType) => {
  const dataMap = {
    categories,
    paymentMethods,
    typeOfMovements,
  } as const;

  return dataMap[dataType] || null;
};
