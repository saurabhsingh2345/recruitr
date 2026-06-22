import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  header: { marginBottom: 24 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  headline: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10, fontWeight: 'bold', color: '#0EA5A0',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  summary: { fontSize: 10, color: '#374151', lineHeight: 1.5 },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  skillName: { fontSize: 10, color: '#111827' },
  skillScore: { fontSize: 10, color: '#6B7280', fontFamily: 'Courier' },
  expTitle: { fontSize: 11, fontWeight: 'bold', color: '#111827' },
  expMeta: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  expCompany: { fontSize: 10, color: '#0EA5A0', marginBottom: 2 },
  bullet: { fontSize: 10, color: '#374151', marginBottom: 2, marginLeft: 8 },
  projName: { fontSize: 11, fontWeight: 'bold', color: '#111827' },
  projDesc: { fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 1.4 },
  projTech: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  eduRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  eduDegree: { fontSize: 10, color: '#111827' },
  eduYear: { fontSize: 10, color: '#6B7280', fontFamily: 'Courier' },
  expBlock: { marginBottom: 12 },
  projBlock: { marginBottom: 10 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: {
    fontSize: 9, color: '#374151',
    borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid',
    paddingHorizontal: 5, paddingVertical: 2,
  },
})

interface ResumeData {
  name: string
  headline: string
  summary?: string
  skills: string[]
  experience: { title: string; company: string; duration: string; bullets: string[] }[]
  projects: { name: string; description: string; tech: string[] }[]
  education: { degree: string; school: string; year: string }[]
}

export function ResumePDF({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.headline}>{data.headline}</Text>
        </View>

        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        )}

        {data.skills?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsWrap}>
              {data.skills.map((s, i) => (
                <Text key={i} style={styles.skillTag}>{s}</Text>
              ))}
            </View>
          </View>
        )}

        {data.experience?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.expBlock}>
                <View style={[styles.skillRow, { marginBottom: 0 }]}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expMeta}>{exp.duration}</Text>
                </View>
                <Text style={styles.expCompany}>{exp.company}</Text>
                {(exp.bullets || []).map((b, j) => (
                  <Text key={j} style={styles.bullet}>· {b}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {data.projects?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((p, i) => (
              <View key={i} style={styles.projBlock}>
                <Text style={styles.projName}>{p.name}</Text>
                <Text style={styles.projDesc}>{p.description}</Text>
                {p.tech?.length > 0 && (
                  <Text style={styles.projTech}>{p.tech.join(' · ')}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {data.education?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((e, i) => (
              <View key={i} style={styles.eduRow}>
                <Text style={styles.eduDegree}>{e.degree} — {e.school}</Text>
                <Text style={styles.eduYear}>{e.year}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  )
}
