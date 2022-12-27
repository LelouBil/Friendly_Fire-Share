import styles from '@/styles/Me.module.css';
import Head from "next/head";
import React, {FormEventHandler, useCallback, useMemo, useState} from "react";
import {Button, Card, Input, Loading, Table, Text} from "@nextui-org/react";
import {useSession} from "next-auth/react";
import {GetServerSidePropsContext, GetServerSidePropsResult} from "next";
import {Session} from "next-auth";
import {prisma} from "../lib/db";
import {getServerSession} from "../lib/customSession";
import {steam_web} from "../lib/steam_web";
import createSteamUser from "../lib/customSteamUser";
import axios from "axios";
import {EAuthTokenPlatformType, LoginSession} from "steam-session";
import {AllowedConfirmation, StartAuthSessionWithQrResponse} from "steam-session/dist/interfaces-internal";
import {useQRCode} from 'next-qrcode';
import {getDeviceName} from "./api/getDeviceName";
import {getSharesOfUser, ShareArray} from "../lib/getSharesOfUser";
import SteamID from "steamid";


type LendInfo = {
    steamId: string,
    name: string,
    enabled: boolean
    deviceId: string | null
}


export type RefreshTokenData = {
    clientId: string;
    requestId: string; //buffer in original
    pollInterval: number;
    challengeUrl: string;
    version: number;
    allowedConfirmations: AllowedConfirmation[];
}

type MeProps = { sharesProp: ShareArray, lendersProp: LendInfo[], machine_id_valid: boolean, refresh_token_data: RefreshTokenData | null, session: Session };

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

export default function Me({sharesProp, machine_id_valid, lendersProp, refresh_token_data}: MeProps) {

    const {data: session} = useSession() as unknown as { data: Session };

    const [machineIdValid, setMachineIdValid] = useState(machine_id_valid);
    const [refreshTokenData, setRefreshTokenData] = useState(refresh_token_data);

    return (
        <div className={styles.container}>
            <Head>
                <title>Friendly Fire-Share | Me</title>
            </Head>

            <div className={styles.mainContainer}>
                <Card className={styles.userContainer}>
                    <Card.Header css={{justifyContent: "center"}}>
                        <MeCard session={session}/>
                    </Card.Header>
                    <Card.Body>
                        <Text h2>Machine ID</Text>
                        {
                            machineIdValid ? "✔" : <SetNewMachineId setValid={setMachineIdValid}/>
                        }
                        <Text h2>Refresh Token</Text>
                        {
                            refreshTokenData !== null ? <SetRefreshToken fulfilled={() => setRefreshTokenData(null)}
                                                                         refreshTokenData={refreshTokenData}/> : "✔"
                        }
                    </Card.Body>
                </Card>
                <div className={styles.tableContainer}>
                    <LendTable lenders={lendersProp} canGet={machineIdValid} borrowerSteamId={session.user.steam_id}/>
                    <ShareTable sharesProp={sharesProp} canAdd={true} canRemove={refreshTokenData === null}/>
                </div>
            </div>
        </div>
    );
}

function SetNewMachineId({setValid}: { setValid: (valid: boolean) => void }) {
    const [machineId, setMachineId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [hasFailed, setHasFailed] = useState(false);
    const submitMachineId: FormEventHandler<HTMLFormElement> = useCallback (async (e) => {
        e.preventDefault();
        setIsLoading(true);

        setHasFailed(false);
        try {
            let response = await axios.post("/api/machineId/set", {
                machine_id: machineId
            });

            if (response.status === 200) {
                setValid(true);
            }
        } catch (e) {
            setHasFailed(true);
        }

        setIsLoading(false);
        //todo eliott
    },[isLoading,hasFailed]);
    return (
        <form onSubmit={submitMachineId} className={styles.machineIdForm}>
            <Input id="machine_id" style={{width: "100%"}} maxLength={310} minLength={310} placeholder={"Paste here"}
                   color={hasFailed ? "error" : "default"}
                   disabled={isLoading} required bordered onChange={e => setMachineId(e.target.value)}/>

            <Button type="submit" disabled={isLoading} iconRight={isLoading && <Loading size={"xs"}/>}>Submit</Button>
            <a href="/machineID.bat">Get my machineID</a>
        </form>
    );

}

function SetRefreshToken({refreshTokenData, fulfilled}: { refreshTokenData: RefreshTokenData, fulfilled: () => void }) {

    const submitData = useMemo(() => async () => {
        await axios.post("/api/refreshToken/set", {refresh_token_data: refreshTokenData});
        fulfilled();
    }, []);

    const {Canvas} = useQRCode();
    return (
        <div>
            <Canvas
                text={refreshTokenData.challengeUrl}
                options={{
                    level: 'M',
                    margin: 3,
                    scale: 4,
                    width: 200,
                    color: {
                        dark: '#010599FF',
                        light: '#FFBF60FF',
                    },
                }}
            />
            <Button onClick={submitData}>J'ai scanné</Button>
        </div>
    );

}

type ShareTableProps = { sharesProp: ShareArray, canRemove: boolean, canAdd: boolean };

function ShareTable({sharesProp, canRemove, canAdd}: ShareTableProps) {
    const [shares, setShares] = useState<ShareArray>(sharesProp);
    const [newUserSteamId, setNewUserSteamId] = useState("");

//todo eliott
    const removeShare = useCallback((index: number) => {
            const user = shares[index];
            axios.post("/api/shares/remove", {borrower: user.steam_id})
                .then(resp => {
                    if (resp.status === 200) {
                        setShares(s => s.filter(u => u.steam_id !== user.steam_id))
                    } else {
                        console.log(resp);
                    }
                })
                .catch(e => {
                    console.error(e);
                })
    }, [shares])

    const addShare = useCallback((steam_id: string) => {
            axios.post("/api/shares/add", {borrower: steam_id})
                .then(resp => {
                    if (resp.status === 200) {
                        setShares(s => [...s, resp.data]);
                    } else {
                        console.log(resp);
                    }
                }).catch(e => {
                console.error(e);
            })
    }, [])

    return (
        <div>
            <Text h2>Shares list</Text>
            <Table className={styles.table} aria-label="Shares list">
                <Table.Header>
                    <Table.Column>Name</Table.Column>
                    <Table.Column>Computer</Table.Column>
                    <Table.Column>Last use</Table.Column>
                    <Table.Column>In Use</Table.Column>
                    <Table.Column>Remove</Table.Column>
                </Table.Header>
                <Table.Body>
                    {shares.map((share, index) => (
                        <Table.Row key={index}>
                            <Table.Cell>{share.name}</Table.Cell>
                            <Table.Cell>{share.computer}</Table.Cell>
                            <Table.Cell>{share.lastUse}</Table.Cell>
                            <Table.Cell>
                                {share.in_use ? "oui" : "non"}
                            </Table.Cell>
                            <Table.Cell>
                                <Button disabled={!canRemove}
                                        onPress={() => removeShare(index)}>Remove {share.name}</Button>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <Input disabled={!canAdd} size="xl" onChange={e => setNewUserSteamId(e.target.value)}/>
            <Button disabled={!canAdd} onPress={() => addShare(newUserSteamId)}>Add User</Button>
        </div>
    );
}

type LendTableProps = { lenders: LendInfo[], canGet: boolean, borrowerSteamId: string };

export function LendTable({lenders, canGet, borrowerSteamId}: LendTableProps) {

    const [lends, setLends] = useState(lenders);


    const getShare = useCallback((id: string) => {
            axios.post("/api/askShare", {lender: id})
                .then(a => {
                    setLends(lends.map(l => {
                        if (l.steamId === id) {
                            return {...l, deviceId: a.data as string}
                        } else return l
                    }));
                })
                .catch(e => {
                    setLends(lends.map(l => {
                        if (l.steamId === id) {
                            return {...l, enabled: false}
                        } else return l
                    }));
                    console.error(e);
                })
    }, [lenders]);

    const downloadScript = useCallback(async (lenderSteamId: string,deviceToken: string ) => {
            const scriptPath = "/addShare.bat";
            const script = (await axios.get(scriptPath)).data as string;
            const edited_script = script.replace("%STEAM_ID%",new SteamID(lenderSteamId).steam3().split(":")[2].replace("]",""))
                .replace("%DEVICE_TOKEN%",deviceToken)
                .replace("%DEVICE_NAME%",getDeviceName(borrowerSteamId));

            const a = document.createElement("a");
            a.style.display = "none";
            document.body.appendChild(a);

            // Set the HREF to a Blob representation of the data to be downloaded
            a.href = window.URL.createObjectURL(
                new Blob([edited_script], { type:"text/plain" })
            );

            // Use download attribute to set desired file name
            a.setAttribute("download", `addShare-${lenderSteamId}-${deviceToken}-${getDeviceName(borrowerSteamId).replace(" ", "_")}.bat`);

            // Trigger the download by simulating click
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(a.href);
            document.body.removeChild(a);

        }
        , []);

    return (
        <div>
            <Text h2>Lenders list</Text>
            <Table className={styles.table} aria-label="Lenders list">
                <Table.Header>
                    <Table.Column>Name</Table.Column>
                    <Table.Column>Get share</Table.Column>
                </Table.Header>
                <Table.Body>
                    {lenders.map(lend => (
                        <Table.Row key={lend.steamId}>
                            <Table.Cell>{lend.name}</Table.Cell>
                            <Table.Cell>
                                {lend.deviceId ? <Button onClick={() => downloadScript(lend.steamId,lend.deviceId!)}>
                                        Télécharger le script
                                    </Button>
                                    :
                                    <Button disabled={!lend.enabled || !canGet}
                                            onClick={() => getShare(lend.steamId)}
                                    >Get Share</Button>
                                }
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    )
}

export async function getServerSideProps(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<MeProps>> {

    let session = await getServerSession(context);


    let server_user = await prisma.user.findUniqueOrThrow({
        where: {
            id: session.user.steam_id
        },
        include: {
            Borrowers: true,
            BorrowsFrom: true
        }
    });


    let refresh_token_data: RefreshTokenData | null = null;
    if (server_user.RefreshToken == null) {

        const loginSession = new LoginSession(EAuthTokenPlatformType.SteamClient);
        loginSession._doPoll = async () => {
        };
        await loginSession.startWithQR();
        const qr_data = loginSession._startSessionResponse as StartAuthSessionWithQrResponse;
        refresh_token_data = {
            ...qr_data,
            allowedConfirmations: [],
            requestId: qr_data.requestId.toString("base64"),
        };
    }

    let machine_id_valid = server_user.MachineId != null;


    // list.reduce((obj, item) => ({...obj, [item.name]: item.value}), {})

    const shares = await getSharesOfUser(server_user);

    let lenders: LendInfo[] = [];

    if (machine_id_valid) {

        const lenderNames: { [k: string]: string } = server_user.BorrowsFrom.length > 0 ?
            (await steam_web.getPlayersSummary(server_user.BorrowsFrom.map(b => b.id)))
                .reduce((acc, elem) => ({...acc, [elem.steamid]: elem.personaname}), {}) : {};


        const lendedMap: { [k: string]: string | null } = await server_user.BorrowsFrom.reduce(async (accum, bf) => {
            if (bf.RefreshToken !== null) {
                const usr = await createSteamUser(bf.RefreshToken, bf.id, null);
                let authorizedSharingDevices = await usr.getAuthorizedSharingDevices();
                const finded = authorizedSharingDevices.devices.find(d =>
                    d.deviceName === getDeviceName(server_user.id)
                );
                await usr.logOff();
                if (finded !== undefined) {
                    return {...accum, [bf.id]: finded.deviceToken}
                } else return {...accum, [bf.id]: null};
            } else {
                return {...accum, [bf.id]: null};
            }
        }, {})


        lenders = server_user.BorrowsFrom.map(bf => {
            return {
                steamId: bf.id,
                name: lenderNames[bf.id],
                enabled: bf.RefreshToken != null,
                deviceId: lendedMap[bf.id]
            }
        })
        ;
    }

    return {
        props: {
            sharesProp: shares,
            lendersProp: lenders,
            refresh_token_data,
            machine_id_valid,
            session: session
        }
    };
}