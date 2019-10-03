const path = require('path');

/**
 * Custom commands processor
 * @class CustomCommand
 */
class CustomCommand {
    /**
     * Init custom command processor
     * @param {SSH2Promise} ssh
     * @param {Stream} shellStream
     */
    constructor(ssh, shellStream) {
        this.commands = {
            get: 'get',
            put: 'put'
        };
        this.promptMask = /[$#%>]\s?/;

        this.ssh = ssh;
        this.shellStream = shellStream;
    }

    /**
     * Look for custom command in terminal line and execute it if found
     * @param {String} line
     * @returns {Promise<void>}
     */
    async processLine(line) {
        const matches = line.match(this.promptMask);

        if (!matches) {
            return;
        }

        const currentDir = line.slice(line.indexOf(':') + 1, matches.index);

        const cmdLine = line.slice(matches.index + matches[0].length);
        const isCustomCommand = !!Object.keys(this.commands).find(
            key => cmdLine.trim().startsWith(this.commands[key] + ' ')
        );

        if (isCustomCommand) {
            const [cmd, from, to] = cmdLine.trim().split(' ');

            this.shellStream.stdout.unpipe();

            switch (cmd) {
                case this.commands.get:
                    await this.getFile(currentDir, from, to);
                    break;
                case this.commands.put:
                    await this.putFile(currentDir, from, to);
                    break;
            }

            // Reset terminal state after little delay:
            setTimeout(() => {
                // Clear terminal buffers:
                while (this.shellStream.stdout.read() !== null) {
                }
                while (this.shellStream.stdin.read() !== null) {
                }

                this.shellStream.stdout.pipe(process.stdout);
                this.shellStream.stdout.write('\n');
            }, 500);
        }
    }

    /**
     * Get file via sftp connection
     * @param {String} currentDir
     * @param {String} remotePath
     * @param {String} localPath
     * @returns {Promise<boolean | void>}
     */
    async getFile(currentDir, remotePath, localPath) {
        if (!localPath) {
            localPath = path.basename(remotePath);
        }

        remotePath = this.resolveRemotePath(remotePath, currentDir);

        process.stdout.write(`\nDownloading "${remotePath}"...\n`);
        return this.ssh.sftp().fastGet(remotePath, localPath)
            .then(() => process.stdout.write('File is downloaded successfully\n'))
            .catch(err => console.log(err.toString()));
    }

    /**
     * Get file via sftp connection
     * @param {String} currentDir
     * @param {String} localPath
     * @param {String} remotePath
     * @returns {Promise<boolean | void>}
     */
    async putFile(currentDir, localPath, remotePath) {
        if (!remotePath) {
            remotePath = path.basename(localPath);
        } else {
            remotePath = this.resolveRemotePath(remotePath, currentDir);
        }

        process.stdout.write(`\nUploading "${remotePath}"...\n`);
        return this.ssh.sftp().fastPut(localPath, remotePath)
            .then(() => process.stdout.write('File is uploaded successfully\n'))
            .catch(err => console.log(err.toString()));
    }

    /**
     * Add current directory to remote path if needed
     * @param {String} remotePath
     * @param {String} currentDir
     * @returns {String}
     */
    resolveRemotePath(remotePath, currentDir) {
        if (!path.isAbsolute(remotePath) && currentDir !== '~') {
            remotePath = `${currentDir.replace('~', '.')}/${remotePath}`
        }

        return path.normalize(remotePath);
    }
}

module.exports = CustomCommand;
