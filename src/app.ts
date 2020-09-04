/*
 * Copyright (c) 2020 Mike M
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import axios from 'axios';
import fs from 'fs';
import qs from 'qs';
import scheduler from 'node-schedule';
import ensure from 'validator';

if (!fs.existsSync('config.json')) {
    console.error(`Hmm, that's odd, I couldn't find the configuration file that is required to make ICO work.`);
    console.error(`If you are just installing this, please either rename the default file [config.default.json] to [config.json], or generate your own configuration file.`);
    process.exit(-1);
}

import config from '../config.json';

import { Course, EnrollmentMetrics } from './lib/course';
import { millisDiff, numberEnding, timestamp } from './lib/util';
import { Twilio } from 'twilio';

const cronRegex = /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;
const sms = config.sms.use ? new Twilio(config.sms.sid, config.sms.token) : null;
const courses: Course[] = config.courses
        .map(course => new Course(course.term,
                course.className,
                course.classNumber,
                course.classSection));

console.log(`Loaded ${courses.length} course${numberEnding(courses.length)} into memory.`);

if (courses.length == 0) {
    console.error(`Hey! You didn't specify any courses to poll enrollment data for.`);
    console.error(`Follow the steps in the provided README to learn how to do this.`);
    process.exit(-1);
}

if (!ensure.matches(config.schedule, cronRegex)) {
    console.error(`The provided cron schedule [${config.schedule}] is not valid.`);
    console.error(`Please use the provided cron formatting diagram below to construct a valid schedule.`);
    console.error(`    *    *    *    *    *    *
    ┬    ┬    ┬    ┬    ┬    ┬
    │    │    │    │    │    │
    │    │    │    │    │    └ day of week (0 - 7)
    │    │    │    │    └───── month (1 - 12)
    │    │    │    └────────── day of month (1 - 31)
    │    │    └─────────────── hour (0 - 23)
    │    └──────────────────── minute (0 - 59)
    └───────────────────────── second (0 - 59, optional)\n`);
    
    process.exit(-1);
}

/**
 * Attempts to lookup information for the provided
 * course from the UConn enrollment service, and
 * notify the user (if they set this up) if it is open.
 * 
 * @param course the course to poll
 */
const run = async (course: Course) => {
    let start = Date.now();
    await axios.post('https://catalog.uconn.edu/wp-content/plugins/uc-courses/soap.php', qs.stringify({
        action: 'get_latest_enrollment',
        term: course._term,
        classNbr: course._id,
        sessionCode: 1,
        classSection: course._section
    }))
    .then(res => res.data)
    .then(async res => {
        if (!res.success) {
            throw new Error('Request unsuccessful');
        }

        let seats: string[] = res.data.split('/');
        let available = parseInt(seats[0]);
        let offered = parseInt(seats[1]);

        if (available >= offered) {
            return console.log(`[${timestamp()}] ${course._name} ${available > offered ? 'is overfilled.' : 'is full.'} (${millisDiff(start, Date.now())}ms)`);
        }

        console.log(`[${timestamp()}] ${course._name} has ${available} seats available. (${millisDiff(start, Date.now())}ms)`)

        let metrics: EnrollmentMetrics = new EnrollmentMetrics(
            course, available, offered,
            available >= offered,
            Number(parseFloat((available / offered).toString()).toFixed(1))
        );

        await notify(metrics);
    })
    .catch(err => {
        console.error(`[${timestamp()}] Error polling enrollment data for ${course._name}:`);
        console.trace(err);
    });
}

/**
 * Attempts to send a SMS notification using Twilio
 * if it is setup in the ICO configuration.
 * 
 * @param metrics the course metrics object
 */
const notify = async (metrics: EnrollmentMetrics) => {
    if (!config.sms.use || sms == null) {
        return;
    }

    await sms.messages.create({
        from: config.sms.sender,
        to: config.sms.recipient,
        body: `Hey you! ${metrics._course._name} has opened up. (${metrics._available}/${metrics._total} seats)`,
    }).catch(err => {
        console.error(`[${timestamp()}] Error dispatching SMS notification`);
        console.trace(err);
    })
}

scheduler.scheduleJob(config.schedule, async () => {
    courses.forEach(async (course) => await run(course));
});