"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import slugify from "slugify";

const AfterLogin = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Redirect to the user's page based on their username
      const username = session?.user?.username;

      if (username) {
        const slug = slugify(username, { lower: true });
        console.log(slug);
        router.push(`/${slug}-projects`);
      } else {
        // Handle cases where the username is not available
        router.push("/");
      }
    }
  }, [status, session, router]);

  return <div>Redirecting...</div>;
};

export default AfterLogin;
