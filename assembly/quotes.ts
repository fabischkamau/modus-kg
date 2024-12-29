import { collections, http } from "@hypermode/modus-sdk-as";
import { models } from "@hypermode/functions-as";
import { EmbeddingsModel } from "@hypermode/models-as/models/experimental/embeddings";


@json
class Quote {

  @alias("q")
  quote!: string;


  @alias("a")
  author!: string;
}

// this function makes a request to an API that returns data in JSON format, and
// returns an object representing the data
export function getRandomQuote(): Quote {
  const request = new http.Request("https://zenquotes.io/api/random");

  const response = http.fetch(request);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch quote. Received: ${response.status} ${response.statusText}`,
    );
  }

  // the API returns an array of quotes, but we only want the first one
  return response.json<Quote[]>()[0];
}

export function addProduct(description: string): string {
  const response = collections.upsert(
    "myProducts", // Collection name defined in the manifest
    null, // using null to let Modus generate a unique ID
    description, // the text to store
    // no labels for this item
    // no namespace provided, use defautl namespace
  );
  return response.keys[0]; // return the identifier of the item
}

export function embed(texts: string[]): f32[][] {
  // "minilm" is the model name declared in the application manifest
  const model = models.getModel<EmbeddingsModel>("minilm");
  const input = model.createInput(texts);
  const output = model.invoke(input);
  return output.predictions;
}

//search products
export function searchProducts(
  product_description: string,
  maxItems: i32,
): collections.CollectionSearchResult {
  const response = collections.search(
    "myProducts", // collection name declared in the application manifest
    "searchMethod1", // search method declared for this collection in the manifest
    product_description, // text to search for
    maxItems,
    true, //  returnText: bool, true to return the items text.
    // no namespace provide, use the default namespace
  );
  return response;
}
