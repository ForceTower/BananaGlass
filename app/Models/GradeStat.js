'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class GradeStat extends Model {
  static get hidden () {
    return ['userHash']
  }
}

module.exports = GradeStat
