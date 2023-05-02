import Document, {DocumentContext, Head, Html, Main, NextScript} from 'next/document';
import {CssBaseline} from '@nextui-org/react';
import React from "react";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      styles: React.Children.toArray([initialProps.styles])
    };
  }

  render() {
    return (
      <Html lang="fr">
        <Head>
          <meta name="description" lang={"fr"} content="Gratte les jeux de tes potes en quelques secondes !"/>
          <link rel="icon" type="image/svg" href="/favicon.svg"/>
          {CssBaseline.flush()}
        </Head>
        <body>
        <Main/>
        <NextScript/>
        </body>
      </Html>
    );
  }
}

export default MyDocument;
