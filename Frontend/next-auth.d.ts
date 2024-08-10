"use client";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      username: string;
      id: string;
      name: string;
      email: string;
      image: string;
    };
  }
}
