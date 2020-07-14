/* eslint-disable no-console */
import chalk from 'chalk';
import * as jsondiffpatch from 'jsondiffpatch';
import { table } from 'table';
import * as _ from 'lodash';

import { Change } from '../change';
import { CompareFormatter, FinishedStats, makeResponseTimesHistogram } from './compare-formatter';
import { ApiEnv } from '../../apiEnv';

export default class ConsoleFormatter extends CompareFormatter {
  numQueriesRun = 0;

  numQueriesChanged = 0;

  logChange(change: Change): void {
    this.numQueriesChanged += 1;

    const apiEnvToApiSh = (apiEnv: ApiEnv): string => {
      if (apiEnv.keyEnv) {
        return `./api.sh --keyEnv ${apiEnv.keyEnv}`;
      }
      return './api.sh';
    };
    const outputLines = `${JSON.stringify(change.query.params)}
    ${apiEnvToApiSh(this.oldApiEnv)} ${change.oldResponse.request?.res?.responseUrl}
    ${apiEnvToApiSh(this.newApiEnv)} ${change.newResponse.request.res.responseUrl}`;

    if (!change.delta) {
      this.writeln(chalk.cyan(`Unchanged: ${outputLines}`));
    } else {
      this.writeln(chalk.yellow(`Changed: ${outputLines}`));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jsondiffpatch.console as any).log(change.delta);
  }

  queryRan(): void {
    this.numQueriesRun += 1;
    if (this.numQueriesRun % 10 === 0) {
      this.writeln(`IN PROGRESS. ${this.numQueriesRun}/${this.totalQueries} run`);
    }
  }

  finished(finishedStats: FinishedStats): void {
    this.writeln(`DONE. ${this.numQueriesChanged}/${this.numQueriesRun} changed`);

    this.writeln(`Elapsed: ${(Date.now() - this.startDate.getTime()) / 1000} seconds`);

    this.writeln('');

    // Response times table
    this.writeln('Response times');
    const oldResponseTimes = makeResponseTimesHistogram(finishedStats.old.responseTimes);
    const newResponseTimes = makeResponseTimesHistogram(finishedStats.new.responseTimes);

    const responseTimesTable = [['', 'old', 'new']];
    _.keys(oldResponseTimes).forEach((key) => {
      responseTimesTable.push([
        key,
        oldResponseTimes[key].toString(),
        newResponseTimes[key].toString(),
      ]);
    });

    this.writeln(table(responseTimesTable));

    // Status codes table
    this.writeln('Status codes');
    const statusCodesTable = [['', 'old', 'new']];
    _.keys(finishedStats.old.statusCodes).forEach((key) => {
      statusCodesTable.push([
        key,
        finishedStats.old.statusCodes[key].toString(),
        finishedStats.old.statusCodes[key].toString(),
      ]);
    });

    this.writeln(table(statusCodesTable));
  }
}
