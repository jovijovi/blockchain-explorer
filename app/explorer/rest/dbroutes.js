/**
*    SPDX-License-Identifier: Apache-2.0
*/

var requtil = require("./requestutils.js");
const dbroutes = (app, persist) => {

  var statusMetrics = persist.getMetricService();
  var crudService = persist.getCrudService();

  app.get("/api/status/:channel", function (req, res) {
    let channelName = req.params.channel;
    if (channelName) {
      statusMetrics.getStatus(channelName, function (data) {
        if (
          data &&
          (data.chaincodeCount &&
            data.txCount &&  data.peerCount)
        ) {
          return res.send(data);
        } else {
          return requtil.notFound(req, res);
        }
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  /***
  Transaction count
  GET /api/block/get -> /api/block/transactions/
  curl -i 'http://<host>:<port>/api/block/transactions/<channel>/<number>'
  Response:
  {
    "number": 2,
    "txCount": 1
  }
  */
  app.get("/api/block/transactions/:channel/:number", async function (req, res) {
    let number = parseInt(req.params.number);
    let channelName = req.params.channel;
    if (!isNaN(number) && channelName) {
        var row = await crudService.getTxCountByBlockNum(channelName,number);
        if (row) {
            return res.send({
              status: 200,
              number: row.blocknum,
              txCount: row.txcount
            });
        }
        return requtil.notFound(req, res);
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  //
  /***
  Transaction Information
  GET /api/tx/getinfo -> /api/transaction/<txid>
  curl -i 'http://<host>:<port>/api/transaction/<channel>/<txid>'
  Response:
  {
    "tx_id": "header.channel_header.tx_id",
    "timestamp": "header.channel_header.timestamp",
    "channel_id": "header.channel_header.channel_id",
    "type": "header.channel_header.type"
  }
  */

  app.get("/api/transaction/:channel/:txid", function (req, res) {
    let txid = req.params.txid;
    let channelName = req.params.channel;
    if (txid && txid != "0" && channelName) {
        crudService.getTransactionByID(channelName, txid).then(row => {
        if (row) {
          return res.send({ status: 200, row });
        }
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  /***
  Transaction list
  GET /api/txList/
  curl -i 'http://<host>:<port>/api/txList/<channel>/<blocknum>/<txid>/<limitrows>/<offset>'
  Response:
  {"rows":[{"id":56,"channelname":"mychannel","blockid":24,
  "txhash":"c42c4346f44259628e70d52c672d6717d36971a383f18f83b118aaff7f4349b8",
  "createdt":"2018-03-09T19:40:59.000Z","chaincodename":"mycc"}]}
  */
  app.get("/api/txList/:channel/:blocknum/:txid", function (req, res) {
    let channelName = req.params.channel;
    let blockNum = parseInt(req.params.blocknum);
    let txid = parseInt(req.params.txid);

    if (isNaN(txid)) {
      txid = 0;
    }
    if (channelName) {
      crudService.getTxList(channelName, blockNum, txid).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  /***Peer List
  GET /peerlist -> /api/peers
  curl -i 'http://<host>:<port>/api/peers/<channel>'
  Response:
  [
    {
      "requests": "grpcs://127.0.0.1:7051",
      "server_hostname": "peer0.org1.example.com"
    }
  ]
  */
  app.get("/api/peers/:channel", function (req, res) {
    let channelName = req.params.channel;
    if (channelName) {
      statusMetrics.getPeerList(channelName, function (data) {
        res.send({ status: 200, peers: data });
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  /***
   List of blocks and transaction list per block
  GET /api/blockAndTxList
  curl -i 'http://<host>:<port>/api/blockAndTxList/channel/<blockNum>/<limitrows>/<offset>'
  Response:
  {"rows":[{"id":51,"blocknum":50,"datahash":"374cceda1c795e95fc31af8f137feec8ab6527b5d6c85017dd8088a456a68dee",
  "prehash":"16e76ca38975df7a44d2668091e0d3f05758d6fbd0aab76af39f45ad48a9c295","channelname":"mychannel","txcount":1,
  "createdt":"2018-03-13T15:58:45.000Z","txhash":["6740fb70ed58d5f9c851550e092d08b5e7319b526b5980a984b16bd4934b87ac"]}]}
  *
  */

  app.get("/api/blockAndTxList/:channel/:blocknum", function (req, res) {
    let channelName = req.params.channel;
    let blockNum = parseInt(req.params.blocknum);
    if (channelName && !isNaN(blockNum)) {
      crudService.getBlockAndTxList(channelName, blockNum).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });


  // TRANSACTION METRICS

  /***
   Transactions per minute with hour interval
  GET /api/txByMinute
  curl -i 'http://<host>:<port>/api/txByMinute/<channel>/<hours>'
  Response:
  {"rows":[{"datetime":"2018-03-13T17:46:00.000Z","count":"0"},{"datetime":"2018-03-13T17:47:00.000Z","count":"0"},{"datetime":"2018-03-13T17:48:00.000Z","count":"0"},{"datetime":"2018-03-13T17:49:00.000Z","count":"0"},{"datetime":"2018-03-13T17:50:00.000Z","count":"0"},{"datetime":"2018-03-13T17:51:00.000Z","count":"0"},
  {"datetime":"2018-03-13T17:52:00.000Z","count":"0"},{"datetime":"2018-03-13T17:53:00.000Z","count":"0"}]}

  */

  app.get("/api/txByMinute/:channel/:hours", function (req, res) {
    let channelName = req.params.channel;
    let hours = parseInt(req.params.hours);

    if (channelName && !isNaN(hours)) {
      statusMetrics.getTxByMinute(channelName, hours).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  /***
   Transactions per hour(s) with day interval
  GET /api/txByHour
  curl -i 'http://<host>:<port>/api/txByHour/<channel>/<days>'
  Response:
  {"rows":[{"datetime":"2018-03-12T19:00:00.000Z","count":"0"},
  {"datetime":"2018-03-12T20:00:00.000Z","count":"0"}]}
  */

  app.get("/api/txByHour/:channel/:days", function (req, res) {
    let channelName = req.params.channel;
    let days = parseInt(req.params.days);

    if (channelName && !isNaN(days)) {
      statusMetrics.getTxByHour(channelName, days).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  /***
  Transactions per day(s) with day interval
  GET /api/txByDay
  curl -i 'http://<host>:<port>/api/txByDay/<channel>/<days>'
  Response:
  {"rows":[{"datetime":"2018-03-12T00:00:00.000Z","count":"0"},
  {"datetime":"2018-03-13T00:00:00.000Z","count":"0"}]}
  */

  app.get("/api/txByDay/:channel/:days", function (req, res) {
    let channelName = req.params.channel;
    let days = parseInt(req.params.days);

    if (channelName && !isNaN(days)) {
      statusMetrics.getTxByDay(channelName, days).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  // BLOCK METRICS

  /***
   Blocks per minute with hour interval
  GET /api/blocksByMinute
  curl -i 'http://<host>:<port>/api/blocksByMinute/<channel>/<hours>'
  Response:
  {"rows":[{"datetime":"2018-03-13T19:59:00.000Z","count":"0"}]}

  */

  app.get("/api/blocksByMinute/:channel/:hours", function (req, res) {
    let channelName = req.params.channel;
    let hours = parseInt(req.params.hours);

    if (channelName && !isNaN(hours)) {
      statusMetrics.getBlocksByMinute(channelName, hours).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  /***
   Blocks per hour(s) with day interval
  GET /api/blocksByHour
  curl -i 'http://<host>:<port>/api/blocksByHour/<channel>/<days>'
  Response:
  {"rows":[{"datetime":"2018-03-13T20:00:00.000Z","count":"0"}]}

  */

  app.get("/api/blocksByHour/:channel/:days", function (req, res) {
    let channelName = req.params.channel;
    let days = parseInt(req.params.days);

    if (channelName && !isNaN(days)) {
      statusMetrics.getBlocksByHour(channelName, days).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  /***
  Blocks per day(s) with day interval
  GET /api/blocksByDay
  curl -i 'http://<host>:<port>/api/blocksByDay/<channel>/<days>'
  Response:
  {"rows":[{"datetime":"2018-03-13T00:00:00.000Z","count":"0"}]}

  */

  app.get("/api/blocksByDay/:channel/:days", function (req, res) {
    let channelName = req.params.channel;
    let days = parseInt(req.params.days);

    if (channelName && !isNaN(days)) {
      statusMetrics.getBlocksByDay(channelName, days).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

  app.get('/api/blocksCountByTime/:channel/:start/:end', function (req, res) {
    // Check params
    if (!req.params.channel || isNaN(req.params.start) || isNaN(req.params.end)) {
      return requtil.invalidRequest(req, res);
    }

    const channelName = req.params.channel;
    const start = req.params.start;
    const end = req.params.end;

    let count;
    statusMetrics.getBlockCountByTime(channelName, start, end).then(rows => {
      if (rows) {
        count = rows;
        return res.send({ status: 200, count });
      }
      return requtil.notFound(req, res);
    });
  });

  app.get('/api/txCountByTime/:channel/:start/:end', function (req, res) {
    // Check params
    if (!req.params.channel || isNaN(req.params.start) || isNaN(req.params.end)) {
      return requtil.invalidRequest(req, res);
    }

    const channelName = req.params.channel;
    const start = req.params.start;
    const end = req.params.end;

    let count;
    statusMetrics.getTxCountByTimePeriod(channelName, start, end).then(rows => {
      if (rows) {
        count = rows;
        return res.send({ status: 200, count });
      }
      return requtil.notFound(req, res);
    });
  });

  /**

    Get blocks by time
    GET /api/blocksByTime
    curl -i 'http://<host>:<port>/api/blocksByTime/<channel>/<start>/<end>/<pagesize>/<pagenum>'
    Response:
   {
       "status": 200,
       "genesisBlock": [
           {
               "blocknum": 0,
               "txcount": 1,
               "createdt": "2018-07-27T03:08:11.000Z",
               "blockhash": "30abc90f41ccf96e34a4f63ec596378948eaef75599f6c4ca83bffec3c2eb46d"
           }
       ],
       "rows": [
           {
               "blocknum": 0,
               "txcount": 1,
               "createdt": "2018-07-27T03:08:11.000Z",
               "blockhash": "30abc90f41ccf96e34a4f63ec596378948eaef75599f6c4ca83bffec3c2eb46d"
           }
       ]
   }

  */

  app.get('/api/blocksByTime/:channel/:start/:end/:pagesize/:pagenum', function (req, res) {
    // Check params
    if (!req.params.channel || isNaN(req.params.start) || isNaN(req.params.end)
        || isNaN(req.params.pagesize) || isNaN(req.params.pagenum)) {
      return requtil.invalidRequest(req, res);
    }

    const channelName = req.params.channel;
    const start = parseInt(req.params.start);
    const end = parseInt(req.params.end);
    const pagesize = parseInt(req.params.pagesize);
    const pagenum = parseInt(req.params.pagenum);

    // Check params
    if (start <= 0 || end <= 0 || pagesize <= 0 || pagenum <= 0) {
      return requtil.invalidRequest(req, res);
    }

    let genesisBlock;
    statusMetrics.getGenesisBlockFromDB(channelName).then(rows => {
      if (rows) {
        genesisBlock = rows;
      }
    });

    let count;
    statusMetrics.getBlockCountByTime(channelName, start, end).then(rows => {
      if (rows) {
        count = rows;
      }
    });

    statusMetrics.getBlocksByTime(channelName, start, end, pagesize, pagenum).then(rows => {
      if (rows) {
        return res.send({ status: 200, genesisBlock, count, rows });
      }
      return requtil.notFound(req, res);
    });
  });

  /**

     Get tx by time
     GET /api/txByTime
     curl -i 'http://<host>:<port>/api/blocksByTime/<channel>/<start>/<end>/<pagesize>/<pagenum>/<objectName>/<chaincodeName>'
     'objectName' is option.
     'chaincodeName' is option.
     Response:
       {
        "status": 200,
        "genesisBlock": [
            {
                "blocknum": 0,
                "txcount": 1,
                "createdt": "2018-09-13T09:12:29.000Z",
                "blockhash": "8314f3ecada68a21645fdbf38f02ede5660521aba993f85660ecf3e4be7f517e"
            }
        ],
        "count": [
            {
                "count": "5"
            }
        ],
        "rows": [
            {
                "blockid": 6,
                "txhash": "753381a30bf65569f8d2348218fe3b6a9964993a3d787c04e10bc0861f69eada",
                "createdt": "2018-09-14T02:29:55.000Z",
                "chaincodename": "fingerprint",
                "genesis_block_hash": "8314f3ecada68a21645fdbf38f02ede5660521aba993f85660ecf3e4be7f517e",
                "metadata": {
                    "userId": "mrds-001-ea16bb801b674166bcf05aada9face2a",
                    "accessKey": "7Qepmk01G3A9I_1n275M",
                    "objectName": "testfile.txt",
                    "objectVersionId": "G0011165D5E9C242FFFF8011003BA483",
                    "fingerprint": "HzivVOBsbm9tvzm6LAUrlS3qXd20hxEns0Y53esRvb4=",
                    "md5sum": "eOuX5kJFLrMK6l925Sp2Aw==",
                    "lastModified": 1536892191000
                }
            }
        ]
      }
  */

    app.get('/api/txByTime/:channel/:start/:end/:pagesize/:pagenum/:objectName?/:chaincodeName?', function (req, res) {
        // Check params
        if (!req.params.channel || isNaN(req.params.start) || isNaN(req.params.end)
            || isNaN(req.params.pagesize) || isNaN(req.params.pagenum)) {
            return requtil.invalidRequest(req, res);
        }

        const channelName = req.params.channel;
        const start = parseInt(req.params.start);
        const end = parseInt(req.params.end);
        const pagesize = parseInt(req.params.pagesize);
        const pagenum = parseInt(req.params.pagenum);
        const objectName = req.params.objectName; // option param.
        let chaincodeName = 'fingerprint'; // option param. 'fingerprint' by default.

        if (req.params.chaincodeName) {
            chaincodeName = req.params.chaincodeName;
        }

        // Check params
        if (start <= 0 || end <= 0 || pagesize <= 0 || pagenum <= 0) {
            return requtil.invalidRequest(req, res);
        }

        let genesisBlock;
        statusMetrics.getGenesisBlockFromDB(channelName).then((rows) => {
            if (rows) {
                genesisBlock = rows;
            }
        });

        let count;
        statusMetrics.getTxCountByTime(channelName, start, end, chaincodeName, objectName).then((rows) => {
            if (rows) {
                count = rows;
            }
        });

        statusMetrics.getTxByTime(channelName, start, end, pagesize, pagenum, objectName, chaincodeName).then((rows) => {
            if (rows) {
                return res.send({
                    status: 200, genesisBlock, count, rows,
                });
            }
            return requtil.notFound(req, res);
        });
    });

  /***
   Transactions by Organization(s)
  GET /api/txByOrg
  curl -i 'http://<host>:<port>/api/txByOrg/<channel>'
  Response:
  {"rows":[{"count":"4","creator_msp_id":"Org1"}]}

  */
  app.get("/api/txByOrg/:channel", function (req, res) {
    let channelName = req.params.channel;

    if (channelName) {
      statusMetrics.getTxByOrgs(channelName).then(rows => {
        if (rows) {
          return res.send({ status: 200, rows });
        }
        return requtil.notFound(req, res);
      });
    } else {
      return requtil.invalidRequest(req, res);
    }
  });

 /**
          Channels
          GET /channels -> /api/channels/info
          curl -i 'http://<host>:<port>/api/channels/<info>'
          Response:
          [
            {
              "channelName": "mychannel",
              "channel_hash": "",
              "craetedat": "1/1/2018"
            }
          ]
        */

       app.get("/api/channels/info", function (req, res) {
        crudService.getChannelsInfo().then(data=>{
          res.send({ status: 200, channels:data })
        }).catch(err=>res.send({status:500}))
    });


}

module.exports = dbroutes;