import pg from "pg";
import { databaseUrl } from "./config/config.js";

export const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
