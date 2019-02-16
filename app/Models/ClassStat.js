'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class ClassStat extends Model {
  grades() {
    return this.hasMany('App/Model/GradeStat', '_id', 'class')
  }
}

module.exports = ClassStat
