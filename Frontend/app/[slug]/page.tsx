"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GitHubContent, Repository } from "@/lib/types";

export default function ImportGitRepository() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      fetchRepositories();
    }
  }, [session]);

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `token ${session?.accessToken}`,
        },
      });
      const data = await response.json();
      setRepositories(data);
      filterReactAndViteRepos(data);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterReactAndViteRepos = async (repos: Repository[]) => {
    const reactViteRepos = await Promise.all(
      repos.map(async (repo) => {
        const isReactOrVite = await checkIfReactOrVite(repo);
        return isReactOrVite ? repo : null;
      }),
    );
    setFilteredRepos(
      reactViteRepos.filter((repo): repo is Repository => repo !== null),
    );
  };

  const checkIfReactOrVite = async (repo: Repository): Promise<boolean> => {
    const rootFiles = await fetchDirectoryContents(repo, "");

    // Check for Vite config files in the root
    if (rootFiles.some((file) => file.name.startsWith("vite.config."))) {
      return true;
    }

    // Check package.json in the root
    const rootPackageJson = rootFiles.find(
      (file) => file.name === "package.json",
    );
    if (rootPackageJson) {
      const isReact = await checkPackageJsonForReact(
        repo,
        rootPackageJson.path,
      );
      const isNextJs = await checkPackageJsonForNextJs(
        repo,
        rootPackageJson.path,
      );
      if (isReact && !isNextJs) {
        return true;
      }
    }

    // Check subdirectories
    const directories = rootFiles.filter((file) => file.type === "dir");
    for (const dir of directories) {
      const subDirFiles = await fetchDirectoryContents(repo, dir.path);
      const subDirPackageJson = subDirFiles.find(
        (file) => file.name === "package.json",
      );
      if (subDirPackageJson) {
        const isReact = await checkPackageJsonForReact(
          repo,
          subDirPackageJson.path,
        );
        const isNextJs = await checkPackageJsonForNextJs(
          repo,
          subDirPackageJson.path,
        );
        if (isReact && !isNextJs) {
          return true;
        }
      }
    }

    return false;
  };

  const fetchDirectoryContents = async (
    repo: Repository,
    path: string,
  ): Promise<GitHubContent[]> => {
    const response = await fetch(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}?ref=${repo.default_branch}`,
      {
        headers: {
          Authorization: `token ${session?.accessToken}`,
        },
      },
    );
    return response.json();
  };

  const checkPackageJsonForReact = async (
    repo: Repository,
    path: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}?ref=${repo.default_branch}`,
        {
          headers: {
            Authorization: `token ${session?.accessToken}`,
          },
        },
      );
      const data = await response.json();
      const content = atob(data.content);
      const packageJson = JSON.parse(content);
      return !!(
        packageJson.dependencies?.react || packageJson.devDependencies?.react
      );
    } catch (error) {
      console.error(
        `Error checking package.json for React in ${repo.name}:`,
        error,
      );
      return false;
    }
  };

  const checkPackageJsonForNextJs = async (
    repo: Repository,
    path: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}?ref=${repo.default_branch}`,
        {
          headers: {
            Authorization: `token ${session?.accessToken}`,
          },
        },
      );
      const data = await response.json();
      const content = atob(data.content);
      const packageJson = JSON.parse(content);
      return !!(
        packageJson.dependencies?.next || packageJson.devDependencies?.next
      );
    } catch (error) {
      console.error(
        `Error checking package.json for Next.js in ${repo.name}:`,
        error,
      );
      return false;
    }
  };

  const searchFilteredRepos = filteredRepos.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getImportUrl = (repo: Repository) => {
    const encodedUrl = encodeURIComponent(repo.html_url);
    return `/${session?.user?.username.toLowerCase()}-projects/deploy?repo=${encodedUrl}`;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-gray-500 border-[2px]">
      <CardHeader>
        <CardTitle>Import React/Vite Repository (Excluding Next.js)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row">
          <Input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
        </div>

        <div>name: {session?.user?.username}</div>
        {isLoading ? (
          <div>Loading repositories...</div>
        ) : (
          <div className="space-y-2">
            {searchFilteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded"
              >
                <div>
                  <span className="font-bold text-stone-200">{repo.name}</span>
                  <span className="ml-2 text-sm text-slate-400">
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <Button className="bg-black text-stone-100 hover:bg-gray-800">
                  <Link href={getImportUrl(repo)}>Import</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
