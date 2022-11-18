export interface Token {
  access_token?: string;
  refresh_token?: string;
  username?: string;
  roles?: string[];
}

export interface Recipe {
  _id: string;
  url: string;
  name: string;
  imageUrl: string;
  ingredients: string[];
  steps: string[];
}

export interface Ingredient {
  grocyProductId: string;
  quantity: string;
  useAnyUnit: boolean;
  quantityUnitId: string;
  isConfirmed?: boolean;
  isIgnored?: boolean;
}

export interface Product {
  id: string;
  name: string;
  qu_id_stock: string;
}

export interface QuantityUnit {
  id: string;
  name: string;
}

export interface QuantityUnitConversion {
  id: string;
  from_qu_id: string;
  to_qu_id: string;
  factor: string;
  product_id: string;
}
