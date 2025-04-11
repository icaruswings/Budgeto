import { Inngest } from "inngest";
import { eventSchemas } from "./types";
import invariant from "tiny-invariant";

invariant(process.env.APP_SLUG, "APP_SLUG must be set in .env");

export const inngest = new Inngest({ id: process.env.APP_SLUG, schemas: eventSchemas });
