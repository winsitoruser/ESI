import { IconNarkotika, IconObatBebas, IconObatBebasTerbatas, IconObatHerbal, IconObatHerbalTerstandarisasi, IconObatJamu, IconObatKeras } from "@/components/common/Icons";

interface ProductProperty {
  color: string;
  typeFull: string;
  type: string;
  Icon: React.ReactNode;
  bgColor: string;
}

export const PRODUCT_TYPES = ["medication", "utility"];

export const PRODUCT_UNIT_TYPES = ["blister", "box", "tablet", "sachet", "pil"];

export const PRODUCT_CATEGORIES = [
  "Jamu",
  "Obat Bebas",
  "Obat Bebas Terbatas",
  "Fitofarmaka",
  "Obat Herbal Terstandar",
  "Obat Keras",
  "Narkotika",
];

export const PRODUCT_CATEGORY_ABBRS = [
  "OJ",
  "OB",
  "OBT",
  "OH",
  "OHT",
  "OK",
  "N",
];

export const PRODUCT_PROPERTIES = [
  {
    color: "#000",
    typeFull: "Jamu",
    type: "OJ",
    Icon: IconObatJamu,
    bgColor: "#009035",
  },
  {
    color: "#FFF",
    typeFull: "Obat Bebas",
    type: "OB",
    Icon: IconObatBebas,
    bgColor: "#009035",
  },
  {
    color: "#FFF",
    typeFull: "Obat Bebas Terbatas",
    type: "OBT",
    Icon: IconObatBebasTerbatas,
    bgColor: "#3E79B9",
  },
  {
    color: "#FFF",
    typeFull: "Fitofarmaka",
    type: "OH",
    Icon: IconObatHerbal,
    bgColor: "#FFEC05",
  },
  {
    color: "#000",
    typeFull: "Obat Herbal Terstandar",
    type: "OHT",
    Icon: IconObatHerbalTerstandarisasi,
    bgColor: "#FFEC05",
  },
  {
    color: "#FFF",
    typeFull: "Obat Keras",
    type: "OK",
    Icon: IconObatKeras,
    bgColor: "#E30016",
  },
  {
    color: "#E30016",
    typeFull: "Narkotika",
    type: "N",
    Icon: IconNarkotika,
    bgColor: "#FFF",
  },
];
