import styles from '@/styles/Me.module.css';
import Head from "next/head";
import React, {FormEventHandler, useEffect, useState} from "react";
import {Button, Card, Checkbox, Input, Table, Text} from "@nextui-org/react";
import {useSession} from "next-auth/react";
import {GetServerSidePropsContext, GetServerSidePropsResult} from "next";
import {Session} from "next-auth";
import {prisma} from "../lib/db";
import {getServerSession} from "../lib/customSession";
import {steam_web} from "../lib/steam_web";
import createSteamUser from "../lib/customSteamUser";
import {SteamPlayerSummary} from "steamwebapi-ts/lib/types/SteamPlayerSummary";
import axios from "axios";
import {EAuthTokenPlatformType, LoginSession} from "steam-session";
import {log} from "util";


type ShareInfo = {
    computer: string | null,
    lastUse: string | null,
    enabled: boolean
}

type BorrowingUser = {
    name: string,
    avatar_url: string,
    profile_url: string,
}

type ShareArray = (ShareInfo & BorrowingUser)[]

type MeProps = { sharesProp: ShareArray, machine_id_valid: boolean, refresh_token_valid: boolean, session: Session };

function MeCard(props: { session: Session }) {
    return <Card variant={"bordered"} style={{width: "fit-content"}}>
        <Card.Footer
            isBlurred
            css={{
                position: "absolute",
                bgBlur: "#ffffff66",
                borderTop: "$borderWeights$light solid rgba(255, 255, 255, 0.2)",
                bottom: 0,
                zIndex: 1,
                height: "20%",
                padding: "0"
            }}
        >
            <Text h4 style={{margin: "auto", paddingBottom: "4px"}}>
                {props.session.user.name}
            </Text>
        </Card.Footer>
        <Card.Body style={{padding: 0}}>
            <Card.Image
                src={props.session.user.profile_picture_url}
                objectFit="cover"
                width="200px"
                alt="Your Steam profile picture"
            />
        </Card.Body>
    </Card>;
}

function ShareTable({sharesProp}: { sharesProp: ShareArray }) {
    const [shares, setShares] = useState<ShareArray>(sharesProp);

    const toggleShare = (index: number) => {
        let newShares = [...shares];
        newShares[index].enabled = !newShares[index].enabled;
        setShares(newShares);
    };

    return (
        <Table className={styles.table} aria-label="Shares list">
            <Table.Header>
                <Table.Column>Name</Table.Column>
                <Table.Column>Computer</Table.Column>
                <Table.Column>Last use</Table.Column>
                <Table.Column>Enabled</Table.Column>
            </Table.Header>
            <Table.Body>
                {shares.map((share, index) => (
                    <Table.Row key={index}>
                        <Table.Cell>{share.name}</Table.Cell>
                        <Table.Cell>{share.computer}</Table.Cell>
                        <Table.Cell>{share.lastUse}</Table.Cell>
                        <Table.Cell>
                            <Checkbox aria-label="Control share state"
                                      isSelected={share.enabled}
                                      isRounded={false}
                                      onChange={() => toggleShare(index)}/>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
}

function SetNewMachineId({setValid}: {setValid: (valid: boolean) => void}) {

    const [machineId, setMachineId] = useState("");
    const submitMachineId: FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        let response = await axios.post("/api/machineId/set", {
            machine_id: machineId
        });

        //todo eliott
    };
    return (
        <form onSubmit={submitMachineId} className={styles.machineIdForm}>
            <Input id="machine_id" maxLength={310} minLength={310} placeholder={"Paste here"} size="lg" required
                   bordered onChange={e => {
                setMachineId(e.target.value)
            }}/>
            <Button type="submit">Submit</Button>
            <a href="/machineID.ps1">Get my machineID</a>
        </form>
    );
}

function SetRefreshToken({setValid}: {setValid: (valid: boolean) => void}) {

    const [loginSession,setLoginSession] = useState<LoginSession>(null!);
    const [qrCodeUrl,setQRCodeUrl] = useState<string | null>(null);

    function submitToken(refresh_token: string){

    }

    useEffect(async () => {
        setLoginSession(new LoginSession(EAuthTokenPlatformType.SteamClient));
        loginSession?.on("authenticated", () => {
            submitToken(loginSession!.refreshToken);
        })
        const result = await loginSession?.startWithQR();
        setQRCodeUrl(result.qrChallengeUrl!);
    })
    return (
        <>
            <div>TODO</div>
        </>
    );
}

export default function Me({sharesProp, machine_id_valid, refresh_token_valid}: MeProps) {

    const {data: session} = useSession() as unknown as { data: Session };

    const [machineIdValid, setMachineIdValid] = useState(machine_id_valid);
    const [refreshTokenValid, setRefreshTokenValid] = useState(refresh_token_valid);

    console.log(session);
    return (
        <div className={styles.container}>
            <Head>
                <title>Me - Friendly Fire-Share</title>
            </Head>

            <MeCard session={session}/>
            <main className={styles.main}>
                <Text h1>
                    {session.user.name}
                </Text>
                <div>
                    <Text h2>
                        Machine ID :
                    </Text>
                    {
                        machineIdValid ? "✔" : <SetNewMachineId setValid={setMachineIdValid}/>
                    }
                </div>
                <div>
                    <Text h2>
                        Refresh Token :
                    </Text>
                    {
                        refreshTokenValid ? "✔" : <SetRefreshToken setValid={setRefreshTokenValid}/>
                    }
                </div>
                <div className={styles.container}>
                    <ShareTable sharesProp={sharesProp}/>
                </div>
            </main>
        </div>
    );
}

export async function getServerSideProps(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<MeProps>> {

    let session = await getServerSession(context);
    let server_user = await prisma.user.findUniqueOrThrow({
        where: {
            id: session.user.steam_id
        },
        include: {
            Borrowers: true
        }
    });

    let refresh_token_valid = server_user.RefreshToken != null;
    let machine_id_valid = server_user.MachineId != null;

    console.log(JSON.stringify(server_user));

    let devices: { [steam_id: string]: any } = {};

    if (server_user.RefreshToken != null) {
        try {
            console.log(session.user.steam_id);
            let steam_client = await createSteamUser(server_user.RefreshToken, session.user.steam_id);
            console.log("Steam client logged in");
            let the_devices = (await steam_client.getAuthorizedSharingDevices()).devices;
            console.log(JSON.stringify(the_devices));
            devices = the_devices.reduce((obj, item) => {

                    if (item?.lastBorrower) {
                        return {...obj, [item.lastBorrower.getSteamID64()]: item};
                    } else
                        return obj;
                }
                , {});
            steam_client.logOff();
        } catch (error) {
            console.error("Error with steam login :", error);
            refresh_token_valid = false;
            await prisma.user.update({
                where: {
                    id: session.user.steam_id
                },
                data: {
                    RefreshToken: null
                }
            });
        }
    }


    // list.reduce((obj, item) => ({...obj, [item.name]: item.value}), {})

    let steam_profiles: SteamPlayerSummary[] = server_user.Borrowers.length > 0 ?
        (await steam_web.getPlayersSummary(server_user.Borrowers.map(b => b.id))) : [];

    const shares: ShareArray = steam_profiles.map(profile => {
        let steam_id = profile.steamid;
        let user_info: BorrowingUser = {
            name: profile.personaname,
            avatar_url: profile.avatarfull,
            profile_url: profile.profileurl
        };

        let share_info: ShareInfo;
        if (devices[steam_id]) {
            let device = devices[steam_id];
            share_info = {
                lastUse: device.lastTimeUsed,
                computer: device.deviceName,
                enabled: device.isCanceled
            };
        } else {
            share_info = {
                lastUse: null,
                computer: null,
                enabled: false
            };
        }
        return {...user_info, ...share_info};
    });

    return {
        props: {
            sharesProp: shares,
            refresh_token_valid,
            machine_id_valid,
            session: session
        }
    };
}