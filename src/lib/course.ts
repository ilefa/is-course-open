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

export class Course {

    _term: string;
    _name: string;
    _id: string;
    _section: string;

    /**
     * 
     * Constructs an object representing an enrollable course.
     * 
     * @param term the identifying number of the term
     * @param name the name of the course
     * @param id the identifying number of this course
     * @param section the section of this course
     */
    constructor(term: string, name: string, id: string, section: string) {
        this._term = term;
        this._name = name;
        this._id = id;
        this._section = section;
    }

}

export class EnrollmentMetrics {

    _course: Course;
    _available: number;
    _total: number;
    _overfill: boolean;
    _percent: number;

    /**
     * 
     * Constructs an object representing enrollment metrics for a course.
     * 
     * @param course the course this data represents
     * @param available the amount of available seats left
     * @param total the total amount of seats allocated
     * @param overfill if this class has overfilled
     * @param percent the percentage of seats filled
     */
    constructor(course: Course, available: number, total: number, overfill: boolean, percent: number) {
        this._course = course;
        this._available = available;
        this._total = total;
        this._overfill = overfill;
        this._percent = percent
    }

}