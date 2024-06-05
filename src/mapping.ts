import { Transfer, ERC721 } from "../generated/ERC721/ERC721";
import { Token, Holder, Collection } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  let tokenId = event.params.tokenId.toString();
  let fromAddress = event.params.from.toHex();
  let toAddress = event.params.to.toHex();
  let collectionId = event.address.toHex(); // Assuming each contract address represents a unique collection
  let collection = Collection.load(collectionId);
  if (!collection) {
    const contract = ERC721.bind(event.address);
    // Fetch the NFT name using the contract call
    const nftNameResult = contract.try_name();
    const nftName = nftNameResult.reverted ? "Unknown" : nftNameResult.value;
    collection = new Collection(collectionId);
    collection.name = nftName;
    collection.holderCount = 0;
  }

  if (fromAddress != "0x0000000000000000000000000000000000000000") {
    let fromHolder = Holder.load(fromAddress);
    if (fromHolder) {
      fromHolder.tokenCount -= 1;
      if (fromHolder.tokenCount === 0) {
        collection.holderCount -= 1;
        fromHolder.collections = [];
      }
      fromHolder.save();
    }
  }

  let toHolder = Holder.load(toAddress);
  if (toHolder && toHolder.tokenCount === 0) {
    collection.holderCount += 1;
  }
  if (!toHolder) {
    toHolder = new Holder(toAddress);
    toHolder.tokenCount = 0;
    toHolder.collections = [];
    collection.holderCount += 1;
  }

  toHolder.tokenCount += 1;

  if (toHolder.collections.indexOf(collectionId) === -1) {
    toHolder.collections.push(collectionId);
  }

  toHolder.save();

  let token = Token.load(tokenId);
  if (!token) {
    token = new Token(tokenId);
    token.collection = collection.id;
  }
  token.owner = toHolder.id;
  token.save();

  collection.save();
}
