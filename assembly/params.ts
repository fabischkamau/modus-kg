/*
 * Helper classes to create parameter json for function calling API
 */
import { JSON } from "json-as";


@json
class Param {
  constructor(type: string, description: string | null = null) {
    this._type = type;
    this._description = description;
  }
  toString(): string {
    return JSON.stringify(this);
  }


  @alias("type")
  protected _type: string;


  @alias("description")
  @omitnull()
  protected _description: string | null;

  get type(): string {
    return this._type;
  }
}


@json
export class ObjectParam extends Param {
  constructor(description: string | null = null) {
    super("object", description);
    this.additionalProperties = false;
  }

  addRequiredProperty(name: string, param: Param): void {
    if (this.properties == null) {
      this.properties = new Map<string, Param>();
    }
    this.properties!.set(name, param);

    if (this.required == null) {
      this.required = [];
    }
    this.required!.push(name);
  }


  @omitnull()
  properties: Map<string, Param> | null = null;


  @omitnull()
  required: string[] | null = null;
  protected additionalProperties: boolean;
}


@json
export class EnumParam extends Param {
  enum: string[];
  constructor(enumValues: string[], description: string | null = null) {
    super("string", description);
    this.enum = enumValues;
  }
}


@json
export class StringParam extends Param {
  constructor(description: string | null = null) {
    super("string", description);
  }
}
