import { exec } from 'child_process';

/**
 * Opens a file or directory in a code editor.
 *
 * @param {string} path - The path of the file or directory to open.
 * @returns {Promise<string>} - A promise that resolves when the file is opened successfully, or rejects with an error.
 */
export const openInCodeEditor = async (path: string): Promise<void> => {
    const command = `code ${path}`;

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`stderr: ${stderr}`);
                return;
            }
            resolve();
        });
    });
};
