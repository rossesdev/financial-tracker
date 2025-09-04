import categories from "../mocks/categories.json";
import paymentMethods from "../mocks/paymentMethods.json";
import typeOfMovements from "../mocks/typeOfMovements.json";

type TDataType = "categories" | "paymentMethods" | "typeOfMovements";

export const getLabelById = (id: string, dataType: TDataType) => {
  const dataList = getDataByType(dataType);

  if (!dataList) return "";

  const foundItem = dataList.find((item) => item.value === id);
  return foundItem ? foundItem.label : "";
};

export const getDataByType = (dataType: TDataType) => {
  switch (dataType) {
    case "categories":
      return categories;
    case "paymentMethods":
      return paymentMethods;
    case "typeOfMovements":
      return typeOfMovements;
    default:
      return null;
  }
};
