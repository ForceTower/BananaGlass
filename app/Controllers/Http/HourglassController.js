'use strict'
const _ = use('lodash')
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

    const overview = await this.overview({request})
    return overview
  }

  async processDiscipline(discipline) {
    let result = {}
    let disciplineTotal = 0
    let disciplineStore = 0
    let disciplineDirect = 0
    let disciplineFinal = 0
    let disciplinePassed = 0

    const { classes } = discipline

    const semesters = _.chain(classes)
      .groupBy('semesterName')
      .map((value, key) => {
        const gradesOnly = _.chain(value).map(res => res.grades).value()
        const grades = [].concat.apply([], gradesOnly)
        const average = _.chain(grades).meanBy('grade').value()

        return {
          semester: key,
          average
        }
      })
      .value()

    const teachers = _.chain(classes)
      .groupBy('teacher')
      .map((value, key) => {
        const gradesOnly = _.chain(value).map(res => res.grades).value()
        const grades = [].concat.apply([], gradesOnly)
        const average = _.chain(grades).meanBy('grade').value()

        const bySemester = _.chain(value)
          .groupBy('semesterName')
          .map((value, key) => {
            const gradesOnly = _.chain(value).map(res => res.grades).value()
            const grades = [].concat.apply([], gradesOnly)
            const average = _.chain(grades).meanBy('grade').value()

            let bySemesterPassed = 0
            let bySemesterDirect = 0
            let bySemesterFinal = 0
            const bySemesterTotal = grades.length

            for (let grade of grades) {
              const {grade: actual, partialScore} = grade
              if (actual >= 5) {
                bySemesterPassed++
              }
              if (partialScore) {
                bySemesterFinal++;
              }
              if (actual >= 7 && !partialScore) {
                bySemesterDirect++;
              }
            }

            return {
              semester: key,
              average,
              total: bySemesterTotal,
              passed: bySemesterPassed,
              direct: bySemesterDirect,
              finals: bySemesterFinal
            }
          })
          .value()

        return {
          teacher: key,
          average,
          semesters: bySemester
        }
      })
      .value()

    for (let clazz of discipline.classes) {
      let totalGrades = clazz.grades.length
      let accumGrades = 0

      for (let grade of clazz.grades) {
        accumGrades += grade.grade || 0

        const {grade: actual, partialScore} = grade
        if (actual >= 5) {
          disciplinePassed++
        }
        if (partialScore) {
          disciplineFinal++;
        }
        if (actual >= 7 && !partialScore) {
          disciplineDirect++;
        }
      }

      disciplineStore += accumGrades
      disciplineTotal += totalGrades
    }

    result['id'] = discipline['_id']
    result['code'] = discipline['code']
    result['name'] = discipline['name']
    result['semesters'] = semesters
    result['teachers'] = teachers
    result['mean'] = disciplineStore / disciplineTotal
    result['total'] = disciplineTotal
    result['passed'] = disciplinePassed
    result['finals'] = disciplineFinal
    result['direct'] = disciplineDirect
    console.log(result)
    return result
  }

  async requestDiscipline({ request }) {
    const data = request.all()
    const { code } = data
    if (!code) {
      return {success: false, message: 'The discipline code is mandatory!', data: null}
    }

    const discipline = await Discipline
      .where('code', code)
      .with('classes')
      .with('classes.grades')
      .first()

    if (!discipline) {
      return {success: false, message: `The discipline ${code} is not registered under the UNESVerse`, data: null}
    }

    const json = JSON.stringify(discipline)
    const value = JSON.parse(json)

    const result = await this.processDiscipline(value)
    return {success: true, message: 'The discipline has been returned', data: result}
  }

  async onRequestStats({ request }) {
    const values = await Discipline
      .with('classes')
      .with('classes.grades')
      .fetch()

    const uefsAvg = await GradeStat.avg('grade');

    const json = JSON.stringify(values)
    const disciplines = JSON.parse(json)

    const result = []

    for (let discipline of disciplines) {
      const partial = await this.processDiscipline(discipline)
      result.push(partial)
    }

    return {success: true, message: 'All the elements were returned', score: uefsAvg, data: result}
  }

  async overview({ request }) {
    const disciplines = await Discipline.all()
    const teachers = await Teacher.all()
    return {success: true, message: 'This are the things...', data: { disciplines, teachers }}
  }
}

module.exports = HourglassController
