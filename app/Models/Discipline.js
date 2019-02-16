'use strict'

const Model = use('Model')
/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
class Discipline extends Model {
  classes() {
    return this.hasMany('app/Models/ClassStat', '_id', 'discipline')
  }
}

module.exports = Discipline
