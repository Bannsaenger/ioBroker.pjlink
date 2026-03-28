/**
 *
 *      library for iobroker pjlink Adapter
 *
 *      Modul :     pjlinkv2
 *      Version:    0.1
 *      Stand:      07.09.2025
 *
 *      Copyright (c) 2025, Bannsaenger <bannsaenger@gmx.de>
 *
 *      MIT License
 *
 */
'use strict';
const net = require('node:net');
const crypto = require('node:crypto');

/**
 * connectionState:
 * NEW:                 When no connection attempt was made till now
 * CONNECTING:          When the connection attempt is running
 * CONNECTED:           When everytiung runs fine. Also when no authentication is needed, then the connection is established without any further doing
 * AUTH1:               When the old authentication is supported
 * AUTH2:               When we have to use the new authentication process
 * READY:               After all authentication is done and we can send data
 * CLOSED:              When something closed the client
 * FAILED:              When a connection attempt failed
 * RECONNECT_WAITING:   When the connection has failed and the reconnect time is running
 */

/** Class encapsuling the basic PJLink communication */
module.exports = class pjlink {
    /**
     * Creates a new PJLink communication instance
     *
     * @param {object} options - Options for the whole instance
     */
    constructor(options = {}) {
        // Parse all options and set defaults
        this.host = options.host || '127.0.0.1';    // address or name of the projector
        this.port = options.port || 4352;           // tcp port of the projector
        this.class = options.class || 1;            // for now only class 1 is supported
        this.password = options.password || null,   // null, if no password/security needed
        this.socketTimeout = options.socketTimeout|| 800; // time to wait for connection

        // Init Logger, if object it should be a iobroker class log
        if (typeof options.logger === 'object') {
            this.log = options.logger;
        } else {
            this.log = new scriptLogger();
        }

        if (this.class != 1) {
            this.log.error(`Only class 1 supported for now`);
            this.class = 1;
        }

        this.cmdWaiting = false;
        this.connectionState = 'NEW';

        this.log.info(`projector instance for host: ${this.host} created`);
    }
    /**********************************************************************************************
     * Methods to handle errors and log the messages
     **********************************************************************************************/
    /* #region log and Error handling */
    /**
     * Called on error situations and from catch blocks
     *
     * @param {any} err the error to log
     * @param {string} module the module in which the error occured
     */
    errorHandler(err, module = '') {
        this.log.error(`PJLink(module) error in method: [${module}] error: ${err.message}, stack: ${err.stack}`);
    }
    /* #endregion */

     /**********************************************************************************************
     * Methods for connection handling
     **********************************************************************************************/
    /* #region connection handling */
    /**
     * connect to the projector, prepare all connection related parameters
     */
    connect() {
        try {
            this.cmdWaiting = true;
            this.connectionState = 'CONNECTING';
            this.connection = net.connect({port: this.port, host: this.host}, this.onClientConnect.bind(this));

            //callbacks
            this.dataCB = this.onClientData.bind(this);
            this.errorCB = this.onClientError.bind(this);
            this.closeCB = this.onClientClose.bind(this);
            this.timeoutCB = this.onClientTimeout.bind(this);

            this.connection.on('data', this.dataCB);
            this.connection.on('error', this.errorCB);
            this.connection.on('close', this.closeCB);
            this.connection.on('timeout', this.timeoutCB);
            this.connection.setTimeout(this.socketTimeout);
            this.connection.setNoDelay(true);
        } catch (err) {
            this.errorHandler(err, 'connect');
        }
    }
    /* #endregion */

    /**********************************************************************************************
     * Methods related to TCP Client handling
     **********************************************************************************************/
    /* #region Client handling */
    // #################################### NET ####################################
    /**
     * is called when client has connected
     */
    onClientConnect() {
        try {
        	this.cmdWaiting = false;
            this.connectionState = 'CONNECTED';
            this.log.debug(`Projector: with ${this.host} connected. Now try to authenticate`);
            // now try to authenticate
        } catch (err) {
            this.errorHandler(err, 'onClientConnect');
        }
    }

    /**
     * is called when the client connection runs into a timeout on connection attempt
     */
    onClientTimeout() {
        try {
            this.connectionState = 'FAILED';
            this.log.debug(`Projector: with ${this.host} connection has timed out`);
        } catch (err) {
            this.errorHandler(err, 'onClientTimeout');
        }
    }

    /**
     * is called when specified client connection has an error
     *
     * @param {Error} err the error occured
     }
     */
    onClientError(err) {
        try {
            this.log.info(`TCP Client: with ${this.host} has an error: ${err.toString()}`);
            //const device = this.devices.find(item => item.ipAddress === ipAddress);
            this.connectionState = 'FAILED';
            this.connection?.destroy();
            this.connection = undefined;
        } catch (err) {
            this.errorHandler(err, 'onClientError');
        }
    }

    /**
     * is called when specified client connection is closed
     */
    onClientClose() {
        try {
            this.log.info(`TCP Client: to ${this.host} is closed`);
            this.connectionState = 'CLOSED';
            this.connection?.destroy();
            this.connection = undefined;
        } catch (err) {
            this.errorHandler(err, 'onClientClose');
        }
    }

    /**
     * called if client is ready to send new data
     */
    onClientContinue() {
        try {
            this.log.debug(`TCP Client: to ${this.host} stream can continue`);
        } catch (err) {
            this.errorHandler(err, 'onClientContinue');
        }
    }

    /**
     * called if client receives data
     *
     * @param {Buffer} data the data received
     */
    onClientData(data) {
        try {
            this.log.debug(`TCP Client: to ${this.host} got data <${data.toString()}>`);
        } catch (err) {
            this.errorHandler(err, 'onClientData');
        }
    }
    /* #endregion */

}

/**
 * Helper Class to write logging like the real adapter programming
 */
class scriptLogger {
    constructor() {}
    silly(message = '') {
        console.log(`${message}`, 'silly');
    }
    trace(message = '') {
        console.log(`${message}`, 'silly');
    }
    debug(message = '') {
        console.log(`${message}`, 'debug');
    }
    info(message = '') {
        console.log(`${message}`, 'info');
    }
    warn(message = '') {
        console.log(`${message}`, 'warn');
    }
    error(message = '') {
        console.log(`${message}`, 'error');
    }
    fatal(message = '') {
        console.log(`${message}`, 'error');
    }
}
