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
} from "@nextui-org/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [deploymentId, setDeploymentId] = useState<string | undefined>();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const deployed = useRef(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<
    string | undefined
  >();
  const [rootDir, setRootDir] = useState<string>("");
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const gitURL = searchParams.get("repo");
  const repoPath = new URL(gitURL!).pathname.slice(1); // Remove leading '/'
  const name = repoPath.split("/")[1];

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
          contents
            .filter((item: any) => item.type === "dir")
            .map(async (item: any) => {
              const dir: Directory = {
                name: item.name,
                path: item.path,
                type: "dir",
              };
              dir.subdirectories = await fetchDirectories(item.path);
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

  useEffect(() => {
    if (deployed.current && deployPreviewURL) {
      setDeployPreviewURL(deployPreviewURL);
    }
  }, [deployed.current, deployPreviewURL]);

  const renderDirectories = (dirs: Directory[], currentPath: string = "") => {
    return (
      <Accordion type="multiple" className="w-full">
        {dirs.map((dir) => {
          const fullPath = currentPath
            ? `${currentPath}/${dir.name}`
            : dir.name;
          return (
            <AccordionItem key={dir.path} value={dir.path}>
              <AccordionTrigger className="flex items-center justify-between py-2 px-4 hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={dir.path}
                    checked={rootDir === fullPath}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setRootDir(fullPath);
                        console.log(fullPath);
                      } else {
                        setRootDir("");
                      }
                    }}
                  />
                  <Label htmlFor={dir.path}>{dir.name}</Label>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {dir.subdirectories && dir.subdirectories.length > 0 && (
                  <div className="pl-6">
                    {renderDirectories(dir.subdirectories, fullPath)}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  const pollLogs = async (deploymentId: string) => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:9000/logs/${deploymentId}`,
        );
        const newLogs = data.logs;

        if (newLogs.length > 0) {
          setLogs((prevLogs) => {
            const existingLogs = new Set(prevLogs); // Using Set to avoid duplicates
            const filteredLogs = newLogs
              .map((log: any) => log.log)
              .filter((log: string) => !existingLogs.has(log));
            return [...prevLogs, ...filteredLogs];
          });
          logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        // Check if deployment is complete ( message in the logs to indicate this)
        const deploymentComplete = newLogs.some((logs: any) =>
          logs.log.includes("all files uploaded"),
        );
        if (deploymentComplete) {
          clearInterval(interval);
          setIsPolling(false);
          deployed.current = true;
        }
      } catch (error) {
        console.error("Error polling logs:", error);
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 3500); // Poll every 5 seconds
  };

  const handleClickDeploy = useCallback(async () => {
    setLoading(true);
    try {
      // First API call: /projects
      const projectResponse = await axios.post(
        `http://localhost:9000/projects`,
        {
          gitURL,
          name,
        },
      );

      if (projectResponse.data && projectResponse.data.data) {
        const { project } = projectResponse.data.data;
        setDeployPreviewURL(project.subDomain + ".localhost:8000");
        setProjectId(project.id);

        // Second API call: /deploy using the response from /projects
        const { data: response } = await axios.post(
          `http://localhost:9000/deploy`,
          {
            projectId: project.id,
            rootDir,
          },
        );

        if (response && response.data) {
          const { deploymentId } = response.data.data;
          console.log("deployResponse", response.data.data);
          setDeploymentId(deploymentId);

          // Start polling logs
          pollLogs(deploymentId);
          console.log("deploymentId", deploymentId);
        }
      }
    } catch (error) {
      console.error("Deployment error:", error);
    } finally {
      setLoading(false);
    }
  }, [gitURL, name, rootDir, deploymentId]);

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
                        {renderDirectories(directories)}
                      </div>
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      color="danger"
                      onClick={() => {
                        onClose;
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      onClick={() => {
                        onClose();
                      }}
                    >
                      Continue
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
        <CardContent className="pt-0">
          <Button
            className="mt-4 w-full"
            onClick={handleClickDeploy}
            disabled={loading}
          >
            Deploy
          </Button>
        </CardContent>
      </Card>
      <Card className="flex flex-col gap-3 min-w-[600px] mt-6 h-[300px]">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent
          className={`h-[240px] overflow-auto ${firaCode.className}`}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
          <div ref={logContainerRef} />
        </CardContent>
        {isPolling && (
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-400">Deployment Status:</span>
            <span className="text-gray-400">Deploying...</span>
          </div>
        )}
        {deployed.current && deployPreviewURL && (
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-400">
              Deployed. View at Preview URL:
            </span>
            <a href={deployPreviewURL} target="_blank" rel="noreferrer">
              {deployPreviewURL}
            </a>
          </div>
        )}
      </Card>
    </main>
  );
}
