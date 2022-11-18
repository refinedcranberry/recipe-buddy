import { ChangeEvent, SyntheticEvent, useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteChangeReason,
  AutocompleteValue,
  Button,
  Checkbox,
  Input,
  MenuItem,
  Select,
  SelectChangeEvent,
  TableCell,
  TableRow,
  TextField,
} from "@mui/material";
import { Product, QuantityUnit, QuantityUnitConversion } from "../types/types";

import { NormalizedLevenshtein } from "string-metric";

interface PropTypes {
  index: number;
  ingredient: string;
  grocyBase: string;
  products: Array<Product>;
  quantityUnits: Array<QuantityUnit>;
  quantityUnitConversions: Array<QuantityUnitConversion>;
  isLoaded: boolean;
  updateMasterMap: Function;
  refreshProducts: Function;
}

export function IngredientRow(props: PropTypes) {
  const {
    index,
    ingredient,
    grocyBase,
    products,
    quantityUnits,
    quantityUnitConversions,
    isLoaded,
    updateMasterMap,
    refreshProducts,
  } = props;

  const newProductSlug =
    "/product/new?closeAfterCreation&flow=InplaceNewProductWithName&name=";

  function createProduct(name: string) {
    setPageShowListener();
    window.open(`${grocyBase}${newProductSlug}${name}`);
  }

  const [useAnyUnit, setUseAnyUnit] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [quantity, setQuantity] = useState<Number | undefined>();
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit | undefined>(
    undefined
  );
  const [availableQuantityUnits, setAvailableQuantityUnits] = useState<
    QuantityUnit[]
  >([]);

  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isIgnored, setIsIgnored] = useState<boolean>(false);
  const [noProducts, setNoProducts] = useState<boolean>(false);

  const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

  function setPageShowListener() {
    window.addEventListener("visibilitychange", logEvent);
    console.log("listener set");
  }

  async function getNewestProduct() {
    const productList = await refreshProducts();

    let highestProductId: number = 0;

    productList.forEach((product: Product) => {
      if (parseInt(product.id) > highestProductId) {
        highestProductId = parseInt(product.id);
      }
    });

    const product = productList.find(
      (x: Product) => x.id == highestProductId.toString()
    );
    setProduct(product);
  }

  async function logEvent(event: any) {
    if (!document.hidden) {
      console.log(event);
      window.removeEventListener("visibilitychange", logEvent);
      console.log("listener unset");
      await getNewestProduct();
    }
  }

  const toggleAnyUnit = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setUseAnyUnit(true);
    } else {
      setUseAnyUnit(false);
      setQuantityUnit(quantityUnits.find((x) => x.id == product!.qu_id_stock));
    }
  };

  const handleConfirm = () => {
    if (!product) return;
    if (!quantityUnit) return;

    let quantity_adjusted = Number(quantity);
    if (!useAnyUnit && product.qu_id_stock != quantityUnit.id) {
      const factor = quantityUnitConversions.find(
        (quc) =>
          product.qu_id_stock == quc.to_qu_id &&
          quantityUnit.id == quc.from_qu_id
      )?.factor;
      quantity_adjusted = quantity_adjusted *= Number(factor);
      console.log(quantity_adjusted);
    }

    updateMasterMap(index, {
      grocyProductId: product.id,
      quantity: quantity_adjusted.toString(),
      useAnyUnit: useAnyUnit,
      quantityUnitId: quantityUnit.id,
      isConfirmed: !isConfirmed,
      isIgnored: false,
    });
    setIsConfirmed(!isConfirmed);
  };

  const handleIgnore = () => {
    updateMasterMap(index, {
      isIgnored: !isIgnored,
    });
    setIsIgnored(!isIgnored);
  };

  const handleProductChange = (
    event: SyntheticEvent,
    value: AutocompleteValue<Product, false, false, false>,
    reason: AutocompleteChangeReason
  ) => {
    if (reason === "removeOption") {
      console.log("removereason");
    } //setProduct(undefined);
    else {
      if (value) setProduct(value);
    }
  };

  function guessQuantity() {
    const match = ingredient.match(/^\d+/);
    if (match && match.length > 0) {
      setQuantity(Number(match[0]));
      return;
    }
    setQuantity(0);
  }

  useEffect(() => {
    if (products.length === 0) {
      setNoProducts(true);
      setIsReadyToRender(true);
      return;
    }

    if (!isLoaded) return;
    if (!ingredient) return;

    // guess quantity
    guessQuantity();
    guessProduct();
    setIsReadyToRender(true);
  }, [isLoaded]);

  function guessProduct() {
    let split = ingredient.split(" ");
    let last_part = split[split.length - 1];
    console.log(last_part);

    let best_similarity = 0;
    let best_product = products[0];
    const instance = new NormalizedLevenshtein();
    products.forEach((p) => {
      const sim = instance.similarity(last_part, p.name);
      if (sim > best_similarity) {
        best_similarity = sim;
        best_product = p;
        console.log(
          `found new candidate ${best_product.name} with similarity ${best_similarity}`
        );
      }
    });

    setProduct(best_product);
  }

  useEffect(() => {
    if (!product) return;
    const resultingUnit = quantityUnits.filter(
      (qu) => product.qu_id_stock == qu.id
    );
    const conversion_units = quantityUnitConversions
      .filter(
        (quc) => quc.product_id == null && quc.from_qu_id == product.qu_id_stock
      )
      .map((quc) => quantityUnits.filter((qu) => qu.id == quc.to_qu_id))
      .flat();

    setAvailableQuantityUnits(resultingUnit.concat(conversion_units));
    setQuantityUnit(quantityUnits.find((x) => x.id == product.qu_id_stock));
  }, [product]);

  interface QuantityUnitDropdownPropTypes {
    useAnyUnit: boolean;
    disabled: boolean;
  }

  const QuantityUnitDropdown = ({
    useAnyUnit,
    disabled,
  }: QuantityUnitDropdownPropTypes) => (
    <Select
      onChange={(event: SelectChangeEvent) =>
        setQuantityUnit(quantityUnits.find((x) => x.id == event.target.value))
      }
      disabled={disabled}
      value={quantityUnit?.id}
      label="Quantity Unit"
    >
      {(useAnyUnit ? quantityUnits : availableQuantityUnits).map((unit) => (
        <MenuItem key={unit.id} value={unit.id}>
          {unit.name}
        </MenuItem>
      ))}
    </Select>
  );

  return isReadyToRender ? (
    noProducts ? (
      <TableRow>
        <TableCell colSpan={7} align="center">
          You must add products to Grocy before using Recipe Buddy
        </TableCell>
      </TableRow>
    ) : (
      <TableRow key={index}>
        <TableCell>{ingredient}</TableCell>
        <TableCell>
          <Autocomplete
            disabled={isConfirmed || isIgnored}
            options={products}
            getOptionLabel={(product) => product.name}
            renderInput={(params) => <TextField {...params} label="Product" />}
            onChange={handleProductChange}
            value={product}
            disableClearable
            sx={{ minWidth: 200 }}
          />
        </TableCell>
        <TableCell>
          <Input
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            disabled={isConfirmed || isIgnored}
          />
        </TableCell>
        <TableCell>
          <Checkbox
            checked={useAnyUnit}
            onChange={toggleAnyUnit}
            disabled={isConfirmed || isIgnored}
          />
        </TableCell>
        <TableCell>
          <QuantityUnitDropdown
            useAnyUnit={useAnyUnit}
            disabled={isConfirmed || isIgnored}
          />
        </TableCell>

        <TableCell>
          <Button
            onClick={() => createProduct(ingredient)}
            disabled={isConfirmed || isIgnored}
          >
            Create Product
          </Button>
        </TableCell>
        <TableCell>
          <Button
            onClick={handleConfirm}
            disabled={isIgnored}
            color="success"
            variant="contained"
          >
            {isConfirmed ? "Confirmed" : "Confirm"}
          </Button>
        </TableCell>
        <TableCell>
          <Button
            onClick={handleIgnore}
            disabled={isConfirmed}
            color="error"
            variant="contained"
          >
            {isIgnored ? "Ignored" : "Ignore"}
          </Button>
        </TableCell>
      </TableRow>
    )
  ) : null;
}
