"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Accordion,
  AccordionItem,
  RadioGroup,
  Radio,
} from "@nextui-org/react";
import { Github } from "lucide-react";
import { Fira_Code } from "next/font/google";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const firaCode = Fira_Code({ subsets: ["latin"] });

type Directory = {
  name: string;
  path: string;
  type: "file" | "dir";
  subdirectories?: Directory[];
};

export default function Home() {
  const { data: session } = useSession();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const searchParams = useSearchParams();

  const [repoURL, setURL] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<
    string | undefined
  >();
  const [rootDir, setRootDir] = useState<string>("");
  const [directories, setDirectories] = useState<Directory[]>([]);

  const logContainerRef = useRef<HTMLElement>(null);

  const encodedRepoUrl = searchParams.get("repo");
  const repoUrl = encodedRepoUrl ? decodeURIComponent(encodedRepoUrl) : "";
  const repoPath = new URL(repoUrl).pathname.slice(1); // Remove leading '/'

  const isValidURL: [boolean, string | null] = useMemo(() => {
    if (!repoURL || repoURL.trim() === "") return [false, null];
    const regex = new RegExp(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/,
    );
    return [regex.test(repoURL), "Enter valid Github Repository URL"];
  }, [repoURL]);

  const handleClickDeploy = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`http://localhost:9000/project`, {
        gitURL: repoURL,
        slug: projectId,
      });

      if (data && data.data) {
        const { projectSlug, url } = data.data;
        setProjectId(projectSlug);
        setDeployPreviewURL(url);
        console.log(`Subscribing to logs:${projectSlug}`);
      }
    } catch (error) {
      console.error("Deployment error:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, repoURL]);

  const fetchDirectories = useCallback(
    async (path: string): Promise<Directory[]> => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoPath}/contents/${path}`,
          {
            headers: {
              Authorization: `token ${session?.accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch repository contents");
        }

        const contents = await response.json();
        const dirs: Directory[] = await Promise.all(
          contents.map(async (item: any) => {
            const dir: Directory = {
              name: item.name,
              path: item.path,
              type: item.type,
            };
            if (item.type === "dir") {
              dir.subdirectories = await fetchDirectories(item.path);
            }
            return dir;
          }),
        );

        return dirs;
      } catch (err) {
        console.error("Error fetching directories:", err);
        return [];
      }
    },
    [repoPath, session],
  );

  useEffect(() => {
    if (repoPath) {
      fetchDirectories("").then(setDirectories);
    }
  }, [fetchDirectories, repoPath]);

  const renderDirectories = (dirs: Directory[], currentPath: string = "") => {
    return dirs.map((dir) => (
      <AccordionItem key={dir.path} aria-label={dir.name} title={dir.name}>
        <Radio value={`${currentPath}/${dir.name}`}>{dir.name}</Radio>
        {dir.subdirectories && dir.subdirectories.length > 0 && (
          <Accordion>
            {renderDirectories(
              dir.subdirectories,
              `${currentPath}/${dir.name}`,
            )}
          </Accordion>
        )}
      </AccordionItem>
    ));
  };

  return (
    <main className="flex flex-col justify-center items-center h-[100vh]">
      <Card className="flex flex-col gap-3 min-w-[600px]">
        <CardHeader>
          <CardTitle>Select Preferences</CardTitle>
        </CardHeader>
        <div className="pl-6"> Root Directory</div>
        <div className="flex flex-row pl-6">
          <Input className="w-6/12" disabled={true} value={rootDir || "./"} />
          <Button onClick={onOpen}>Edit</Button>
          <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent className="text-white">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 border-b border-gray-700">
                    Root Directory
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-gray-400 text-sm">
                      Select the directory where your source code is located. To
                      deploy a monorepo, create separate projects for other
                      directories in the future.
                    </p>
                    <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
                      <div className="p-2 flex items-center gap-2">
                        <span className="text-gray-400"></span>
                      </div>
                      <div className="pl-6">
                        <RadioGroup value={rootDir} onValueChange={setRootDir}>
                          <Accordion>
                            {renderDirectories(directories)}
                          </Accordion>
                        </RadioGroup>
                      </div>
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="danger" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button color="primary" onClick={onClose}>
                      Continue
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>

        <CardContent>
          <p className="text-gray-400">Enter the repository URL to deploy </p>
        </CardContent>
      </Card>
      <div className="w-[600px]">
        {session?.user?.name}
        <span className="flex justify-start items-center gap-2">
          <Github className="text-5xl" />
          <Input
            disabled={loading}
            value={repoURL}
            onChange={(e) => setURL(e.target.value)}
            type="url"
            placeholder="Github URL"
          />
        </span>
        <Button
          onClick={handleClickDeploy}
          disabled={!isValidURL[0] || loading}
          className="w-full mt-3"
        >
          {loading ? "In Progress" : "Deploy"}
        </Button>
        {deployPreviewURL && (
          <div className="mt-2 bg-slate-900 py-4 px-2 rounded-lg">
            <p>
              Preview URL{" "}
              <a
                target="_blank"
                className="text-sky-400 bg-sky-950 px-3 py-2 rounded-lg"
                href={deployPreviewURL}
              >
                {deployPreviewURL}
              </a>
            </p>
          </div>
        )}
        {logs.length > 0 && (
          <div
            className={`${firaCode.className} text-sm text-green-500 logs-container mt-5 border-green-500 border-2 rounded-lg p-4 h-[300px] overflow-y-auto`}
          >
            <pre className="flex flex-col gap-1">
              {logs.map((log, i) => (
                <code
                  ref={logs.length - 1 === i ? logContainerRef : undefined}
                  key={i}
                >{`> ${log}`}</code>
              ))}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
