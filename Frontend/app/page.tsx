"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

const LandingPage = () => {
  const { status } = useSession();
  const router = useRouter();

  const handleGitHubLogin = () => {
    // Redirect to /home after successful login
    signIn("github", { callbackUrl: "/import" });
  };

  return (
    <div className="min-h-screen text-white">
      <main className="container mx-auto text-center py-20">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to the Vercel Clone App!
        </h1>
        <p className="mb-8 text-gray-400">
          This project is a clone of Vercel, a company known for maintaining the
          Next.js web development framework. The architecture of Vercel is built
          around composable architecture, and deployments are handled through
          Git repositories. Vercel is a member of the MACH Alliance.
        </p>
        <Button
          onClick={handleGitHubLogin}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Login with GitHub
          <Github className=" pl-1 text-5xl" />
        </Button>
      </main>
    </div>
  );
};

export default LandingPage;
