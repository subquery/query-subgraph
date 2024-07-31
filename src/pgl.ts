import {preset} from "./config"
import {postgraphile} from "postgraphile";

// Our PostGraphile instance:
export const pgl = postgraphile(preset);