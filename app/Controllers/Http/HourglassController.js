'use strict'
const Discipline = use('App/Models/Discipline')
const ClassStat = use('App/Models/ClassStat')
const Teacher = use('App/Models/Teacher')
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

      const teach = await Teacher.findOrCreate(
        {teacherHash},
        {teacherHash, teacher}
      )

      // The union of a discipline a semester and a teacher generates a class
      const clazz = await ClassStat.findOrCreate(
        {discipline: discipline['_id'], semester, teacherHash},
        {discipline: discipline['_id'], semester, teacher, teacherHash, semesterName, teacherId: teach['_id']}
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
    const values = await Discipline.with('classes').with('classes.grades').fetch()
    const uefsAvg = await GradeStat.avg('grade');

    const json = JSON.stringify(values)
    const disciplines = JSON.parse(json)

    const teachers = []

    for (let discipline of disciplines) {
      let totalClasses = 0
      let accumClasses = 0

      for (let clazz of discipline.classes) {
        let totalGrades = clazz.grades.length
        let accumGrades = 0

        for (let grade of clazz.grades) {

        }

        totalClasses += totalGrades
      }
    }

    return {success: true, message: 'All the elements were returned', score: uefsAvg, data: disciplines}
  }
}

module.exports = HourglassController
