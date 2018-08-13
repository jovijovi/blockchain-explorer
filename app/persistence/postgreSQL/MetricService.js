/**
*    SPDX-License-Identifier: Apache-2.0
*/

var helper = require('../../helper.js');
var logger = helper.getLogger('metricservice');
var sql = require('./db/pgservice.js');

class MetricService {

    constructor() {

    }


        //==========================query counts ==========================
    getChaincodeCount(channelName) {
      return sql.getRowsBySQlCase(`select count(1) c from chaincodes where genesis_block_hash='${channelName}' `)
    }

    getPeerlistCount(channelName) {
      return sql.getRowsBySQlCase(`select count(1) c from peer where genesis_block_hash='${channelName}' `)
    }

    getTxCount(channelName) {
      return sql.getRowsBySQlCase(`select count(1) c from transactions where genesis_block_hash='${channelName}'`)
    }

    getBlockCount(channelName) {
      return sql.getRowsBySQlCase(`select count(1) c from blocks where genesis_block_hash='${channelName}'`)
    }

    async getPeerData(channelName) {
      let peerArray = []
      var c1 = await sql.getRowsBySQlNoCondtion(`select channel.name as channelname,c.requests as requests,c.genesis_block_hash as genesis_block_hash ,c.server_hostname as server_hostname from peer as c inner join  channel on c.genesis_block_hash=channel.genesis_block_hash where c.genesis_block_hash='${channelName}'`);
      for (var i = 0, len = c1.length; i < len; i++) {
        var item = c1[i];
        peerArray.push({ 'name': item.channelname, 'requests': item.requests, 'server_hostname': item.server_hostname ,"genesis_block_hash":item.genesis_block_hash})
      }
      return peerArray
    }
//BE -303
	async getOrdererData() {
      let ordererArray = []
      var c1 = await sql.getRowsBySQlNoCondtion(`select c.requests as requests,c.server_hostname as server_hostname,c.genesis_block_hash as genesis_block_hash from orderer c`);
      for (var i = 0, len = c1.length; i < len; i++) {
        var item = c1[i];
        ordererArray.push({  'requests': item.requests, 'server_hostname': item.server_hostname,'genesis_block_hash':item.genesis_block_hash })
      }
      return ordererArray
    }
//BE -303
    async getTxPerChaincodeGenerate(channelName) {
      let txArray = []
      var c = await sql.getRowsBySQlNoCondtion(`select  c.name as chaincodename,channel.name as channelname ,c.version as version,c.genesis_block_hash as genesis_block_hash,c.path as path ,txcount  as c from chaincodes as c inner join channel on c.genesis_block_hash=channel.genesis_block_hash where  c.genesis_block_hash='${channelName}' `);
      //console.log("chaincode---" + c)
      if (c) {
        c.forEach((item, index) => {
          txArray.push({ 'channelName': item.channelname, 'chaincodename': item.chaincodename, 'path': item.path, 'version': item.version, 'txCount': item.c,'genesis_block_hash':item.genesis_block_hash })
        })
      }
      return txArray

    }

    async getTxPerChaincode(channelName, cb) {
      try {
        var txArray = await this.getTxPerChaincodeGenerate(channelName);
        cb(txArray);
      } catch(err) {
        logger.error(err)
        cb([])
      }
    }

    async getStatusGenerate(channelName) {
      var chaincodeCount = await this.getChaincodeCount(channelName)
      if (!chaincodeCount) chaincodeCount = 0
      var txCount = await this.getTxCount(channelName)
      if (!txCount) txCount = 0
      txCount.c = txCount.c ? txCount.c : 0
      var blockCount = await this.getBlockCount(channelName)
      if (!blockCount) blockCount = 0
      blockCount.c = blockCount.c ? blockCount.c : 0
      var peerCount = await this.getPeerlistCount(channelName)
      if (!peerCount) peerCount = 0
      peerCount.c = peerCount.c ? peerCount.c : 0
      return { 'chaincodeCount': chaincodeCount.c, 'txCount': txCount.c, 'latestBlock': blockCount.c, 'peerCount': peerCount.c }
    }

    async getStatus(channelName, cb) {

      try {
          var data = await this.getStatusGenerate(channelName);
          cb(data);
      } catch(err) {
        logger.error(err)
      }

    }

    async getPeerList(channelName, cb) {
      try {
          var peerArray = await this.getPeerData(channelName);
          cb(peerArray)
      } catch(err) {
        logger.error(err)
        cb([])
      }
    }
	//BE -303
	async getOrdererList(cb) {
      try {
          var ordererArray = await this.getOrdererData();
          cb(ordererArray)
      } catch(err) {
        logger.error(err)
        cb([])
      }
    }
//BE -303
    //transaction metrics

    getTxByMinute(channelName, hours) {
      let sqlPerMinute = ` with minutes as (
            select generate_series(
              date_trunc('min', now()) - '${hours}hour'::interval,
              date_trunc('min', now()),
              '1 min'::interval
            ) as datetime
          )
          select
            minutes.datetime,
            count(createdt)
          from minutes
          left join TRANSACTIONS on date_trunc('min', TRANSACTIONS.createdt) = minutes.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerMinute);
    }

    getTxByHour(channelName, day) {
      let sqlPerHour = ` with hours as (
            select generate_series(
              date_trunc('hour', now()) - '${day}day'::interval,
              date_trunc('hour', now()),
              '1 hour'::interval
            ) as datetime
          )
          select
            hours.datetime,
            count(createdt)
          from hours
          left join TRANSACTIONS on date_trunc('hour', TRANSACTIONS.createdt) = hours.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerHour);
    }

    getTxByDay(channelName, days) {
      let sqlPerDay = ` with days as (
            select generate_series(
              date_trunc('day', now()) - '${days}day'::interval,
              date_trunc('day', now()),
              '1 day'::interval
            ) as datetime
          )
          select
            days.datetime,
            count(createdt)
          from days
          left join TRANSACTIONS on date_trunc('day', TRANSACTIONS.createdt) =days.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerDay);
    }

    getTxByWeek(channelName, weeks) {
      let sqlPerWeek = ` with weeks as (
            select generate_series(
              date_trunc('week', now()) - '${weeks}week'::interval,
              date_trunc('week', now()),
              '1 week'::interval
            ) as datetime
          )
          select
            weeks.datetime,
            count(createdt)
          from weeks
          left join TRANSACTIONS on date_trunc('week', TRANSACTIONS.createdt) =weeks.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerWeek);
    }

    getTxByMonth(channelName, months) {
      let sqlPerMonth = ` with months as (
            select generate_series(
              date_trunc('month', now()) - '${months}month'::interval,
              date_trunc('month', now()),
              '1 month'::interval
            ) as datetime
          )

          select
            months.datetime,
            count(createdt)
          from months
          left join TRANSACTIONS on date_trunc('month', TRANSACTIONS.createdt) =months.datetime  and channelname ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerMonth);
    }

    getTxByYear(channelName, years) {
      let sqlPerYear = ` with years as (
            select generate_series(
              date_trunc('year', now()) - '${years}year'::interval,
              date_trunc('year', now()),
              '1 year'::interval
            ) as year
          )
          select
            years.year,
            count(createdt)
          from years
          left join TRANSACTIONS on date_trunc('year', TRANSACTIONS.createdt) =years.year and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerYear);
    }

    // block metrics API

    getGenesisBlockFromDB(channelName) {
        let sqlGenesisBlock = ` select blocknum, txcount, createdt, blockhash
            from blocks
            where genesis_block_hash = '${channelName}'
              and blocknum = 0
            ; `;

        logger.info("sqlGenesisBlock=", sqlGenesisBlock);

        return sql.getRowsBySQlQuery(sqlGenesisBlock);
    }

    getBlockCountByTime(channelName, start, end) {
        // select count(1)
        // from blocks
        // where genesis_block_hash = '87dafea1872f64a6ff20b1c728c81d000a40ffa28f3193ab8ba84907a38d3c3f'
        // and createdt >= '20180725'
        // and createdt <= '20180727'
        // ;
        let sqlCountByTime = ` select count(1)
            from blocks
            where genesis_block_hash = '${channelName}'
              and createdt >= '${start}'
              and createdt <= '${end}'
              ; `;

        logger.info("sqlCountByTime=", sqlCountByTime);

        return sql.getRowsBySQlQuery(sqlCountByTime);
    }

    getBlocksByTime(channelName, start, end, pagesize, pagenum) {
        // select blocknum, txcount, createdt, blockhash
        // from blocks
        // where genesis_block_hash = '87dafea1872f64a6ff20b1c728c81d000a40ffa28f3193ab8ba84907a38d3c3f'
        // and createdt >= '20180725'
        // and createdt <= '20180727'
        // and blocknum <= (select max(blocknum) from blocks where genesis_block_hash = '87dafea1872f64a6ff20b1c728c81d000a40ffa28f3193ab8ba84907a38d3c3f')-10*(1-1)
        // order by blocknum desc
        // limit 10;
        let sqlByTime = ` select blocknum, txcount, createdt, blockhash
            from blocks
            where genesis_block_hash = '${channelName}'
              and createdt >= '${start}'
              and createdt <= '${end}'
              and blocknum <= (select max(blocknum) from blocks where genesis_block_hash = '${channelName}')-${pagesize}*(${pagenum}-1)
            order by blocknum desc
            limit ${pagesize} ; `;

        logger.info("sqlByTime=", sqlByTime);

        return sql.getRowsBySQlQuery(sqlByTime);
    }

    getBlocksByMinute(channelName, hours) {
      let sqlPerMinute = ` with minutes as (
            select generate_series(
              date_trunc('min', now()) - '${hours} hour'::interval,
              date_trunc('min', now()),
              '1 min'::interval
            ) as datetime
          )
          select
            minutes.datetime,
            count(createdt)
          from minutes
          left join BLOCKS on date_trunc('min', BLOCKS.createdt) = minutes.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1  `;

      return sql.getRowsBySQlQuery(sqlPerMinute);
    }

    getBlocksByHour(channelName, days) {
      let sqlPerHour = ` with hours as (
            select generate_series(
              date_trunc('hour', now()) - '${days}day'::interval,
              date_trunc('hour', now()),
              '1 hour'::interval
            ) as datetime
          )
          select
            hours.datetime,
            count(createdt)
          from hours
          left join BLOCKS on date_trunc('hour', BLOCKS.createdt) = hours.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerHour);
    }

    getBlocksByDay(channelName, days) {
      let sqlPerDay = `  with days as (
            select generate_series(
              date_trunc('day', now()) - '${days}day'::interval,
              date_trunc('day', now()),
              '1 day'::interval
            ) as datetime
          )
          select
            days.datetime,
            count(createdt)
          from days
          left join BLOCKS on date_trunc('day', BLOCKS.createdt) =days.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerDay);
    }

    getBlocksByWeek(channelName, weeks) {
      let sqlPerWeek = ` with weeks as (
            select generate_series(
              date_trunc('week', now()) - '${weeks}week'::interval,
              date_trunc('week', now()),
              '1 week'::interval
            ) as datetime
          )
          select
            weeks.datetime,
            count(createdt)
          from weeks
          left join BLOCKS on date_trunc('week', BLOCKS.createdt) =weeks.datetime and genesis_block_hash ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerWeek);
    }

    getBlocksByMonth(channelName, months) {
      let sqlPerMonth = `  with months as (
            select generate_series(
              date_trunc('month', now()) - '${months}month'::interval,
              date_trunc('month', now()),
              '1 month'::interval
            ) as datetime
          )
          select
            months.datetime,
            count(createdt)
          from months
          left join BLOCKS on date_trunc('month', BLOCKS.createdt) =months.datetime and genesis_block_hash  ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerMonth);
    }

    getBlocksByYear(channelName, years) {
      let sqlPerYear = ` with years as (
            select generate_series(
              date_trunc('year', now()) - '${years}year'::interval,
              date_trunc('year', now()),
              '1 year'::interval
            ) as year
          )
          select
            years.year,
            count(createdt)
          from years
          left join BLOCKS on date_trunc('year', BLOCKS.createdt) =years.year and genesis_block_hash  ='${channelName}'
          group by 1
          order by 1 `;

      return sql.getRowsBySQlQuery(sqlPerYear);
    }

    getTxByOrgs(channelName) {
      let sqlPerOrg = ` select count(creator_msp_id), creator_msp_id
      from transactions
      where genesis_block_hash ='${channelName}'
      group by  creator_msp_id`;

      return sql.getRowsBySQlQuery(sqlPerOrg);
    }


}

module.exports = MetricService;