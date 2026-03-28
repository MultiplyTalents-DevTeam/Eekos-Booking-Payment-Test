export function getFilteredRooms(rooms, state) {
  let filteredRooms = Array.isArray(rooms) ? rooms.slice() : [];

  if (state.guests !== "all") {
    filteredRooms = filteredRooms.filter((room) => room.guestBand === state.guests);
  }

  if (state.balconyOnly) {
    filteredRooms = filteredRooms.filter((room) => room.tags.includes("Balcony"));
  }

  if (state.sort === "size") {
    filteredRooms.sort((left, right) => right.size - left.size);
  }

  return filteredRooms;
}

