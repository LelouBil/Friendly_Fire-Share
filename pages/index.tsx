import Head from 'next/head';
import styles from '@/styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Friendly Fire-Share</title>
        <meta name="description" content="Gratte les jeux de tes potes en quelques secondes !"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>

      <main className={styles.main}>
        <a href={"/me"} style={{fontSize: "20rem"}}>ME</a>
      </main>

      <footer className={styles.footer}>

      </footer>
    </div>
  );
}
