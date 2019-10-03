const minimist = require('minimist');

/**
 * Print help and error text (if provided), then exit
 * @param {string|null} errorStr
 */
function showHelpAndError(errorStr) {
    if (errorStr) {
        console.log(errorStr);
    }

    console.log('Usage:\tnode ssh.js username[:password]@host [-L port:host:hostport] [-R host:hostport]');
    process.exit(errorStr ? 1 : 0);
}

/**
 * Parse command line arguments
 * @returns {{}} Generated config for further SSH connection
 */
function argvParser() {
    const argv = minimist(process.argv.slice(2));
    const config = {};

    if (!argv._[0]) {
        showHelpAndError(null);
    }

    const [usernameAndPassword, host] = argv._[0].split('@');
    const [username, password] = usernameAndPassword.split(':');

    if (!host || !username) {
        showHelpAndError('Connection params can\'t be parsed');
    }

    config.connParams = { username, password, host };

    if (argv.L) {
        const [port, host, hostport] = argv.L.split(':');

        if (!port || !host || !hostport) {
            showHelpAndError('Local to remote port forwarding params can\'t be parsed');
        }

        config.forwardOutParams = { port, host, hostport };
    }

    if (argv.R) {
        const [host, port] = argv.R.split(':');

        if (!host || !port) {
            showHelpAndError('Remote to local port forwarding params can\'t be parsed');
        }

        config.forwardInParams = { host, port };
    }

    return config;
}

module.exports = argvParser;
