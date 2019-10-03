const SSH2Promise = require('ssh2-promise');
const readline = require('readline');

const argvParser = require('./argvParser');
const CustomCommander = require('./customCmd');

let ssh = null;

async function main() {
    const config = argvParser();
    ssh = new SSH2Promise(config.connParams);
    await runShell();

    if (config.forwardOutParams) {
        await forwardOut(config.forwardOutParams);
    }

    if (config.forwardInParams) {
        await forwardIn(config.forwardInParams);
    }
}

/**
 * Connect to ssh and create shell stream
 * @returns {Promise<void>}
 */
async function runShell() {
    await ssh.connect();
    const shellStream = await ssh.shell();

    shellStream.on('close', () => {
        console.log('Connection closed.');
    });

    shellStream.on("exit", exitCode => {
        process.exit(exitCode);
    });

    process.stdin.setRawMode(true);
    process.stdin.pipe(shellStream.stdout);
    shellStream.stdout.pipe(process.stdout);
    shellStream.stderr.pipe(process.stderr);

    const customCommander = new CustomCommander(ssh, shellStream);

    const rlInterface = readline.createInterface({
        input: shellStream.stdin,
        terminal: true,
        crlfDelay: Infinity
    });

    rlInterface.on('line', line => {
        customCommander.processLine(line);
    });
}

/**
 * Create ssh tunnel for forwarding out
 * @param {{}} params
 * @returns {Promise<void>}
 */
async function forwardOut(params) {
    await ssh.addTunnel({
        localPort: params.port,
        remoteAddr: params.host,
        remotePort: params.hostport
    });
    console.log(`Listening for connections on local port ${params.port}\n`);
}

/**
 * Create ssh tunnel for forwarding in
 * @param {{}} params
 * @returns {Promise<void>}
 */
async function forwardIn(params) {
    // TODO
}

main()
    .catch(err => console.log(err.toString()));
