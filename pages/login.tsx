import styles from '@/styles/Login.module.css';
import Head from "next/head";
import {Button, Loading} from "@nextui-org/react";
import {signIn} from "next-auth/react";
import {GetServerSidePropsContext} from "next";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import {getServerSession} from "@/lib/customSession";
import {serverSideTranslations} from "next-i18next/serverSideTranslations";
import {useTranslation} from 'react-i18next';


export default function Login() {
  const router = useRouter();
  const callbackUrl: string = router.query.callbackUrl as (string | undefined) || "/";

  const {t} = useTranslation("login");

  const [isLoading, setIsLoading] = useState(false);

  if (router.query.error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>{t("pageName")}</title>
        </Head>
        <main className={styles.main}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p>{t("error.message")}</p>
          <Button disabled={isLoading} onPress={() => {
            setIsLoading(true);
            signIn("steam", {callbackUrl}).then(() => {
              setIsLoading(false);
            });
          }}>{!isLoading ? `${t("error.button")}` : <Loading size={"sm"}/>}</Button>
        </main>
      </div>
    );
  } else {
    useEffect(() => {
      // noinspection JSIgnoredPromiseFromCall
      signIn("steam", {callbackUrl});
    });

    return (
      <div className={styles.container}>
        <Head>
          <title>{t("pageName")}</title>
        </Head>
        <main className={styles.main}>
          <h1 className={styles.title}>{t("title")}</h1>
          <Loading size="xl">{t("loading")}</Loading>
        </main>
      </div>
    );
  }
}

// If connected, then redirect to given callback uri query param
export async function getServerSideProps(context: GetServerSidePropsContext) {
  let session = await getServerSession(context);

  // If session exists, and there is no error in query param
  if (session) {
    return {
      redirect: {
        permanent: false,
        destination: context.query.callbackUrl || "/"
      },
      props: {
        ...(await serverSideTranslations(context.locale || context.defaultLocale!))
      }
    };
  }
  return {
    props: {
      ...(await serverSideTranslations(context.locale || context.defaultLocale!))
    }
  };
}