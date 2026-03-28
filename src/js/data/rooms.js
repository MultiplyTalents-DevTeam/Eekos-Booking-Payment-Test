import { IMG } from "./images.js";

export const ROOM_DATA = [
  {
    id: "suite-with-balcony",
    name: "Suite with Balcony",
    typeLabel: "Couples stay",
    guestBand: "1-2",
    beds: "1 queen bed",
    size: 26,
    fromRate: 3850,
    startingRate: 0,
    tags: ["Balcony", "City view", "Private bathroom"],
    details: ["Refrigerator", "Electric kettle", "Desk", "Flat-screen TV", "Wardrobe or closet", "Linens"],
    description: "A more polished stay for couples who want extra openness, city-facing light, and a balcony-led room experience.",
    images: [IMG.img22, IMG.img23, IMG.img34, IMG.img05]
  },
  {
    id: "one-bedroom-suite",
    name: "One-Bedroom Suite",
    typeLabel: "Spacious suite",
    guestBand: "1-2",
    beds: "1 queen bed",
    size: 29,
    fromRate: 3900,
    startingRate: 0,
    tags: ["Balcony", "City view", "Private bathroom"],
    details: ["Refrigerator", "Electric kettle", "Sitting area", "Desk", "Flat-screen TV", "Wardrobe or closet"],
    description: "A larger suite layout with more breathing room and lounge energy, shaped for guests who want a fuller stay rather than just a bed-and-bath setup.",
    images: [IMG.img12, IMG.img25, IMG.img31, IMG.img38]
  },
  {
    id: "family-studio",
    name: "Family Studio",
    typeLabel: "Group stay",
    guestBand: "5+",
    beds: "3 full beds",
    size: 30,
    fromRate: 5450,
    startingRate: 0,
    tags: ["Private bathroom", "Flat-screen TV", "Electric kettle"],
    details: ["Desk", "Wardrobe or closet", "Linens", "Clothes rack", "Socket near bed", "Family-friendly layout"],
    description: "The biggest room in the set, built for bigger family or barkada stays with generous sleeping capacity and an easy open-plan feel.",
    images: [IMG.img13, IMG.img18, IMG.img16, IMG.img19]
  },
  {
    id: "deluxe-twin-room",
    name: "Deluxe Twin Room",
    typeLabel: "Flexible twin",
    guestBand: "1-2",
    beds: "2 twin beds",
    size: 18,
    fromRate: 3450,
    startingRate: 0,
    tags: ["Private bathroom", "Flat-screen TV", "View"],
    details: ["Electric kettle", "Desk", "Wardrobe or closet", "Linens", "Clothes rack", "Socket near bed"],
    description: "A practical twin option for friends, colleagues, or guests who want separate beds without losing the warm EEKOS character.",
    images: [IMG.img15, IMG.img26, IMG.img27, IMG.img01]
  },
  {
    id: "deluxe-family-room",
    name: "Deluxe Family Room",
    typeLabel: "Family comfort",
    guestBand: "3-4",
    beds: "2 full beds",
    size: 28,
    fromRate: 4450,
    startingRate: 0,
    tags: ["Private bathroom", "Flat-screen TV", "Electric kettle"],
    details: ["Sitting area", "Desk", "Wardrobe or closet", "Linens", "Clothes rack", "Socket near bed"],
    description: "A strong family-friendly option with a roomier footprint, more sleeping flexibility, and enough openness for shared stays.",
    images: [IMG.img18, IMG.img13, IMG.img19, IMG.img14]
  },
  {
    id: "suite",
    name: "Suite",
    typeLabel: "Flexible suite",
    guestBand: "3-4",
    beds: "1 sofa bed + 1 queen bed",
    size: 26,
    fromRate: 3450,
    startingRate: 0,
    tags: ["Private bathroom", "Flat-screen TV", "Electric kettle"],
    details: ["Desk", "Wardrobe or closet", "Linens", "Sofa bed", "Clothes rack", "Socket near bed"],
    description: "A flexible suite layout that suits small families or mixed sleeping needs, with a softer lounge feel than a standard room.",
    images: [IMG.img28, IMG.img03, IMG.img24, IMG.img30]
  },
  {
    id: "deluxe-room",
    name: "Deluxe Room",
    typeLabel: "Classic stay",
    guestBand: "1-2",
    beds: "1 full bed",
    size: 16,
    fromRate: 3250,
    startingRate: 0,
    tags: ["Private bathroom", "Flat-screen TV", "Electric kettle"],
    details: ["Desk", "Wardrobe or closet", "Linens", "Clothes rack", "Socket near bed", "Compact layout"],
    description: "A compact, efficient room for short stays and simple getaways, with a straightforward layout that still feels clean and elevated.",
    images: [IMG.img20, IMG.img06, IMG.img09, IMG.img17]
  }
];

