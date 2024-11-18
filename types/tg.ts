export type IBotFunction = {
    setMyCommands: (commands: Array<{ command: string; description: string }>) => Promise<void>;
};