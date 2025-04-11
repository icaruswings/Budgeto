import invariant from "tiny-invariant";

invariant(process.env.CLERK_DOMAIN, "CLERK_DOMAIN is required in .env.local");

export default {
  providers: [
    {
      domain: process.env.CLERK_DOMAIN,
      applicationID: "convex",
    },
  ],
};
