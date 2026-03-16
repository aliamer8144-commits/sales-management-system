// Unit conversion utilities

interface UnitConversionResult {
  cartonStock: number;
  packetStock: number;
  pieceStock: number;
}

/**
 * Convert stock to proper units
 * Example: If 1 carton = 6 packets, 1 packet = 30 pieces
 * And we have 3 cartons + 65 pieces
 * Result should be: 3 cartons + 2 packets + 5 pieces (if base unit is carton)
 * 
 * Or for packet-based: 1 packet = 30 pieces
 * And we have 3 packets + 65 pieces
 * Result should be: 5 packets + 5 pieces
 */
export function convertToProperUnits(
  cartonStock: number,
  packetStock: number,
  pieceStock: number,
  piecesPerPacket: number,
  packetsPerCarton: number = 0
): UnitConversionResult {
  // Start with total pieces
  let totalPieces = pieceStock;
  
  // Add pieces from packets
  if (piecesPerPacket > 0) {
    totalPieces += packetStock * piecesPerPacket;
  }
  
  // Add pieces from cartons
  if (packetsPerCarton > 0 && piecesPerPacket > 0) {
    totalPieces += cartonStock * packetsPerCarton * piecesPerPacket;
  }
  
  // Now convert back to proper units
  let newCartonStock = 0;
  let newPacketStock = 0;
  let newPieceStock = totalPieces;
  
  // Convert to cartons first if applicable
  if (packetsPerCarton > 0 && piecesPerPacket > 0) {
    const piecesPerCarton = packetsPerCarton * piecesPerPacket;
    newCartonStock = Math.floor(totalPieces / piecesPerCarton);
    newPieceStock = totalPieces % piecesPerCarton;
    
    // Then convert remaining to packets
    newPacketStock = Math.floor(newPieceStock / piecesPerPacket);
    newPieceStock = newPieceStock % piecesPerPacket;
  } else if (piecesPerPacket > 0) {
    // Convert to packets
    newPacketStock = Math.floor(totalPieces / piecesPerPacket);
    newPieceStock = totalPieces % piecesPerPacket;
  }
  
  return {
    cartonStock: newCartonStock,
    packetStock: newPacketStock,
    pieceStock: newPieceStock,
  };
}

/**
 * Convert any unit to pieces
 */
export function convertToPieces(
  unitType: 'carton' | 'packet' | 'piece',
  quantity: number,
  piecesPerPacket: number,
  packetsPerCarton: number = 0
): number {
  if (unitType === 'piece') {
    return quantity;
  } else if (unitType === 'packet' && piecesPerPacket > 0) {
    return quantity * piecesPerPacket;
  } else if (unitType === 'carton' && packetsPerCarton > 0 && piecesPerPacket > 0) {
    return quantity * packetsPerCarton * piecesPerPacket;
  }
  return quantity;
}

/**
 * Get total pieces for a product from all unit stocks
 */
export function getTotalPieces(
  cartonStock: number,
  packetStock: number,
  pieceStock: number,
  piecesPerPacket: number,
  packetsPerCarton: number = 0
): number {
  let total = pieceStock;
  
  if (piecesPerPacket > 0) {
    total += packetStock * piecesPerPacket;
  }
  
  if (packetsPerCarton > 0 && piecesPerPacket > 0) {
    total += cartonStock * packetsPerCarton * piecesPerPacket;
  }
  
  return total;
}
