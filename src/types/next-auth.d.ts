import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

declare module "next-auth" {
  interface Session {
    user: User & {
      id: string;
      role: string;
    };
  }

  interface User {
    id: string;
    role: string;
  }
}
