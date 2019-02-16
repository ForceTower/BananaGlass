'use strict'
const Discipline = use('App/Models/Discipline')
const ClassStat = use('App/Models/ClassStat')
const GradeStat = use('App/Models/GradeStat')
const crypto = require("crypto")

class HourglassController {
  async onReceiveStats ({ request }) {
    const data = request.all()
    const {
      disciplines,
      semester,
      score,
      userId
    } = data

    const userHash = crypto.createHash('md5').update(userId.toLowerCase()).digest('hex')

    for (let i = 0; i < disciplines.length; i++) {
      const data = disciplines[i]
      const {
        code,
        disciplineName,
        grade,
        partialScore,
        semester,
        semesterName,
        teacher
      } = data

      const teacherHash = crypto.createHash('md5').update(teacher.toLowerCase()).digest('hex')

      // Creates the discipline if it doesn't exists
      const discipline = await Discipline.findOrCreate(
        {code},
        {code, name: disciplineName}
      )

      // The union of a discipline a semester and a teacher generates a class
      const clazz = await ClassStat.findOrCreate(
        {discipline: discipline['_id'], semester, teacherHash},
        {discipline: discipline['_id'], semester, teacher, teacherHash, semesterName}
      )


      const gradeStat = await GradeStat.findOrCreate(
        { userHash, class: clazz['_id'] },
        { userHash, class: clazz['_id'] }
      )

      gradeStat['grade'] = grade
      gradeStat['partialScore'] = partialScore
      await gradeStat.save()
    }

    return {success: true, message: 'All the elements are now in place'}
  }

  async onRequestStats({ request }) {
    const disciplines = Discipline.with('classes').fetch()
    return {success: true, message: 'All the elements where returned', data: disciplines}
  }
}

module.exports = HourglassController
