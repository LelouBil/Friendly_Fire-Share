import styles from '@/styles/Me.module.css';
import Head from "next/head";
import React, {FormEventHandler, useCallback, useEffect, useState} from "react";
import {Button, Card, Dropdown, Grid, Input, Link, Loading, Modal, Table, Text} from "@nextui-org/react";
import {useSession} from "next-auth/react";
import {GetServerSidePropsContext, GetServerSidePropsResult} from "next";
import {Session} from "next-auth";
import {prisma} from "@/lib/db";
import {getServerSession} from "@/lib/customSession";
import {steam_web} from "@/lib/steam_web";
import withSteamUser from "../lib/customSteamUser";
import axios, {AxiosError} from "axios";
import {useQRCode} from 'next-qrcode';
import {getDeviceName} from "./api/getDeviceName";
import {getSharesOfUser, ShareArray} from "@/lib/getSharesOfUser";
import SteamID from "steamid";
import {RemoveBorrowerBody} from "@/pages/api/shares/remove";
import {serverSideTranslations} from 'next-i18next/serverSideTranslations';
import {SSRConfig, Trans, useTranslation} from "next-i18next";
import {RefreshTokenData} from "@/pages/api/refreshToken/getData";
import {AbortSignal} from "next/dist/compiled/@edge-runtime/primitives/abort-controller";


type LendInfo = {
    steamId: string,
    name: string,
    isAuthenticated: boolean
    borrowerAuthorizedDeviceToken: string | null,
    borrowerInCurrentShareList: boolean
}

type SteamFriendWithId = {
    name: string,
    steam_id: string
}

type MeProps = {
    sharesProp: ShareArray,
    lendersProp: LendInfo[],
    machine_id_valid: boolean,
    refresh_token_valid: boolean,
    session: Session,
    friendIdList: SteamFriendWithId[]
} & SSRConfig;

function MeCard(props: { session: Session }) {
    const {t} = useTranslation();

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
                alt={t("card.imageAlt")!}
            />
        </Card.Body>
    </Card>;
}

export default function Index({sharesProp, machine_id_valid, lendersProp, refresh_token_valid, friendIdList}: MeProps) {

    const {data: session} = useSession() as unknown as { data: Session };
    const [machineIdValid, setMachineIdValid] = useState(machine_id_valid);
    const [refreshTokenValid, setRefreshTokenValid] = useState(refresh_token_valid);

    return (
        <div className={styles.container}>
            <Head>
                <title>Friendly Fire-Share</title>
                <meta name="description" lang={"fr"} content="Gratte les jeux de tes potes en quelques secondes !"/>
                <link rel="icon" href="/favicon.ico"/>
            </Head>

            <main className={styles.mainContainer}>
                <Card className={styles.userContainer}>
                    <Card.Header css={{justifyContent: "center"}}>
                        <MeCard session={session}/>
                    </Card.Header>
                </Card>
                <div className={styles.tableContainer}>
                    {
                        machineIdValid && refreshTokenValid ?
                            <>
                                <LendTable lenders={lendersProp} canGet={machineIdValid}
                                           borrowerSteamId={session.user.steam_id}/>
                                <ShareTable sharesProp={sharesProp} friendList={friendIdList}/>
                            </> :
                            <>
                                {
                                    !machineIdValid ?
                                        <SetNewMachineId setValid={setMachineIdValid}/> :
                                        <SetRefreshToken setValid={setRefreshTokenValid}/>
                                }
                            </>
                    }
                </div>
            </main>
        </div>
    );
}

function SetNewMachineId({setValid}: { setValid: (valid: boolean) => void }) {
    const {t} = useTranslation();

    const [machineId, setMachineId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [hasFailed, setHasFailed] = useState(false);
    const submitMachineId: FormEventHandler<HTMLFormElement> = useCallback(async (e) => {
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
        } finally {
            setIsLoading(false);
        }

    }, [machineId]);
    return (
        <div>
            <Text h2>{t("connection.step1.title")}</Text>
            <Text blockquote>
                <Trans i18nKey={"connection.step1.description"} components={{
                    machineIdLink: <Link style={{height: "100%", display: "inline-block"}} href="/machineID.bat"/>
                }}></Trans>
            </Text>
            <form onSubmit={submitMachineId} className={styles.machineIdForm}>
                <Grid.Container gap={2}>
                    <Grid>
                        <Input id="machine_id" style={{width: "100%"}} maxLength={310} minLength={310}
                               placeholder={t("connection.step1.placeholder")!}
                               aria-label={t("connection.step1.placeholder")!}
                               color={hasFailed ? "error" : "default"}
                               disabled={isLoading} required bordered onChange={e => setMachineId(e.target.value)}/>
                    </Grid>
                    <Grid>
                        <Button auto type="submit" disabled={isLoading || machineId.length !== 310}
                                iconRight={isLoading && <Loading size={"xs"}/>}>
                            {t("connection.step1.button")}
                        </Button>
                    </Grid>
                </Grid.Container>
            </form>
        </div>
    );
}

function SetRefreshToken({setValid}: { setValid: (isValid: boolean) => void }) {
    const {t} = useTranslation();

    const [hasFailed, setHasFailed] = useState(false);

    const [refreshTokenData, setRefreshTokenData] = useState<RefreshTokenData | null>(null);

    const refreshQR = () => {
        axios.post("/api/refreshToken/getData")
            .then(res => {
                setRefreshTokenData(res.data)
                axios.post("/api/refreshToken/set", {refresh_token_data: res.data as RefreshTokenData},{signal: AbortSignal.timeout(29000)})
                    .then(() => {
                        setHasFailed(false);
                        setValid(true)
                    })
                    .catch(() => {
                        setHasFailed(true);
                        refreshQR();
                    })
            })
    };

    useEffect(() => {
        refreshQR();

        const interval = setInterval(() => {
            refreshQR();
        }, 29 * 1000);

        return () => clearInterval(interval);
    }, [])


    const {Canvas} = useQRCode();
    return (
        <div style={{textAlign: "center"}}>
            <Text h2>{t("connection.step2.title")}</Text>
            {
                refreshTokenData == null
                    ?
                    <Loading size={"xs"}/>
                    :
                    <div>
                        <Canvas
                            text={refreshTokenData.challengeUrl}
                            options={{
                                level: 'M',
                                margin: 3,
                                scale: 4,
                                width: 200,
                                color: {
                                    dark: '#333',
                                    light: '#ddd'
                                }
                            }}
                        />
                        {/*<Button disabled={isLoading} onPress={submitData} style={{margin: "0 auto"}}*/}
                        {/*        iconRight={isLoading && <Loading size={"xs"}/>}>*/}
                        {/*    {t("connection.step2.button")}*/}
                        {/*</Button>*/}
                        {
                            hasFailed && <Text color={"error"}>{t("connection.step2.error")}</Text>
                        }
                    </div>
            }
        </div>
    );

}

type ShareTableProps = { sharesProp: ShareArray, friendList: SteamFriendWithId[] };

function ShareTable({sharesProp, friendList}: ShareTableProps) {
    const [shares, setShares] = useState<ShareArray>(sharesProp);
    const [selectedFriend, setSelectedFriend] = useState<SteamFriendWithId | null>(null);
    const [isAddLoading, setIsAddLoading] = useState(false);
    const [isRemoveLoading, setIsRemoveLoading] = useState(false);

    const {t} = useTranslation();

    //todo eliott
    //todo interface pour le "remove_from_database"
    // modal avec checkbox ?
    const removeShare = useCallback((index: number) => {
        setIsRemoveLoading(true);
        const user = shares[index];
        const remove_data: RemoveBorrowerBody = {
            remove_from_database: true,
            borrower_steam_id: user.steam_id
        };

        axios.post("/api/shares/remove", remove_data)
            .then(resp => {
                if (resp.status === 200) {
                    setShares(s => s.filter(u => u.steam_id !== user.steam_id));
                } else {
                    console.log(resp);
                }
            }).catch(e => {
            console.error(e);
        }).finally(() => {
            setIsRemoveLoading(false);
        });
    }, [shares]);

    const addShare = useCallback((steam_id: string) => {
        setIsAddLoading(true);
        axios.post("/api/shares/add", {borrower: steam_id})
            .then(resp => {
                if (resp.status === 200) {
                    setShares(s => [...s, resp.data]);
                    setSelectedFriend(null);
                } else {
                    console.log(resp);
                }
            }).catch(e => {
            console.error(e);
        }).finally(() => {
            setIsAddLoading(false);
        });
    }, []);

    return <div>
        <Text h2>{t("shares.list.tableName")}</Text>
        <Table className={styles.table} aria-label="Shares list">
            <Table.Header>
                <Table.Column>{t("shares.list.columns.name")}</Table.Column>
                <Table.Column>{t("shares.list.columns.computer")}</Table.Column>
                <Table.Column>{t("shares.list.columns.inUse")}</Table.Column>
                <Table.Column>{t("shares.list.columns.unauthorize")}</Table.Column>
            </Table.Header>
            <Table.Body>
                {shares.map((share, index) => <Table.Row key={index}>
                    <Table.Cell>{share.name}</Table.Cell>
                    <Table.Cell>{share.computer}</Table.Cell>
                    <Table.Cell>
                        {share.in_use ? t("shares.list.inUse.yes") : t("shares.list.inUse.no")}
                    </Table.Cell>
                    <Table.Cell>
                        <Button disabled={isRemoveLoading} onPress={() => removeShare(index)}>
                            {!isRemoveLoading ? t("shares.list.unauthorize.buttonText", {borrower: share.name}) :
                                <Loading size={"xs"}/>}
                        </Button>
                    </Table.Cell>
                </Table.Row>)}
            </Table.Body>
        </Table>
        <div style={{display: "inline-flex", gap: "1rem"}}>
            <Dropdown>
                <Dropdown.Button>
                    {t("shares.addUser.dropDownText")}
                </Dropdown.Button>
                <Dropdown.Menu
                    disallowEmptySelection
                    selectionMode="single"
                    selectedKeys={selectedFriend?.steam_id}
                    onSelectionChange={(e) => setSelectedFriend(friendList.find(f => f.steam_id === Array.from(e as Set<String>).join('')) || null)}>
                    {
                        friendList.filter(f => !shares.find(s => s.steam_id === f.steam_id))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(friend => <Dropdown.Item key={friend.steam_id}>{friend.name}</Dropdown.Item>)
                    }
                </Dropdown.Menu>
            </Dropdown>
            <Button disabled={isAddLoading || !selectedFriend} onPress={() => addShare(selectedFriend!.steam_id)}>
                {
                    !isAddLoading ?
                        t("shares.addUser.buttonText", {friend: selectedFriend?.name || ""}) :
                        <Loading size={"xs"}/>
                }
            </Button>
        </div>
    </div>;
}

type LendTableProps = { lenders: LendInfo[], canGet: boolean, borrowerSteamId: string };

type ModalData = { error: number, title: string, content: string }

export function LendTable({lenders, canGet, borrowerSteamId}: LendTableProps) {

    const [lends, setLends] = useState<LendInfo[]>(lenders);
    const [isShareButtonLoading, setIsShareButtonLoading] = useState(false);
    const [errorModal, setErrorModal] = useState<ModalData | null>(null);

    const {t} = useTranslation("common");

    const getShare = useCallback(async (id: string) => {
        setIsShareButtonLoading(true);
        try {
            const response = await axios.post("/api/askShare", {lender: id});
            setLends(old_lends => old_lends.map<LendInfo>(l => {
                if (l.steamId === id) {
                    return {
                        ...l,
                        borrowerAuthorizedDeviceToken: response.data.token,
                        borrowerInCurrentShareList: true
                    };
                } else return l;
            }));
        } catch (err) {
            const e = err as AxiosError;
            if (e.response) {
                setErrorModal({
                    error: e.response.status,
                    title: t("lend.askShare.error", {errorStatus: e.response.status}),
                    content: e.response.data as string
                });
            }

            setLends(lends.map(l => {
                if (l.steamId === id) {
                    return {...l, isAuthenticated: false};
                } else return l;
            }));
            console.error(e);
        } finally {
            setIsShareButtonLoading(false);
        }
    }, [lends, setLends]);

    const downloadScript = useCallback(async (lenderSteamId: string, deviceToken: string) => {
        const scriptPath = "/addShare.bat";
        const script = (await axios.get(scriptPath)).data as string;
        console.log(`DeviceToken : ${deviceToken}`)
        const edited_script = script.replace("%STEAM_ID%", new SteamID(lenderSteamId).steam3().split(":")[2].replace("]", ""))
            .replace("%DEVICE_TOKEN%", deviceToken)
            .replace("%DEVICE_NAME%", getDeviceName(borrowerSteamId));

        const a = document.createElement("a");
        a.style.display = "none";
        document.body.appendChild(a);

        // Set the HREF to a Blob representation of the data to be downloaded
        a.href = window.URL.createObjectURL(
            new Blob([edited_script], {type: "text/plain"})
        );

        // Use download attribute to set desired file name
        a.setAttribute("download", `addShare-${lenderSteamId}-${deviceToken}-${getDeviceName(borrowerSteamId).replace(" ", "_")}.bat`);

        // Trigger the download by simulating click
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);

    }, []);

    return (
        <div>
            <Text h2>{t("lend.list.tableName")}</Text>
            <Table className={styles.table} aria-label="Lenders list">
                <Table.Header>
                    <Table.Column>{t("lend.list.columns.name")}</Table.Column>
                    <Table.Column>{t("lend.list.columns.getShare")}</Table.Column>
                </Table.Header>
                <Table.Body>
                    {lends.map(lend => (
                        <Table.Row key={lend.steamId}>
                            <Table.Cell>{lend.name}</Table.Cell>
                            <Table.Cell>
                                {lend.borrowerAuthorizedDeviceToken && lend.borrowerInCurrentShareList ?
                                    <Button
                                        onClick={() => downloadScript(lend.steamId, lend.borrowerAuthorizedDeviceToken!)}>
                                        {t("lend.getShare.downloadScript")}
                                    </Button>
                                    :
                                    <Button disabled={!lend.isAuthenticated || !canGet || isShareButtonLoading}
                                            onClick={() => getShare(lend.steamId)}>
                                        {
                                            isShareButtonLoading ?
                                                <Loading size={"xs"}/> : t("lend.askShare.askShareButton")
                                        }
                                    </Button>
                                }
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <Modal closeButton blur open={errorModal != null} onClose={() => setErrorModal(null)}>
                <Modal.Header>
                    <Text h3 color={"error"}>
                        {errorModal?.title}
                    </Text>
                </Modal.Header>
                <Modal.Body>
                    {errorModal?.content}
                </Modal.Body>
            </Modal>
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
            Borrowers: true,
            BorrowsFrom: true
        }
    });


    let refresh_token_valid = server_user.RefreshToken != null;
    console.log(`Refresh token valid ${refresh_token_valid}`)

    let machine_id_valid = server_user.MachineId != null;


    // list.reduce((obj, item) => ({...obj, [item.name]: item.value}), {})

    const shares = await getSharesOfUser(server_user);

    let friends_with_names: SteamFriendWithId[] = [];

    let lenders: LendInfo[] = [];

    if (machine_id_valid) {

        const lenderNames: { [k: string]: string } = server_user.BorrowsFrom.length > 0 ?
            (await steam_web.getPlayersSummary(server_user.BorrowsFrom.map(b => b.id)))
                .reduce((acc, elem) => ({...acc, [elem.steamid]: elem.personaname}), {}) : {};
        const friends = await steam_web.getFriendList(server_user.id);

        //filter by db

        const registeredFriends = await prisma.user.findMany({
            select: {
                id: true
            },
            where: {
                id: {
                    in: friends.map(f => f.steamid)
                }
            }
        })


        const friend_summaries = await steam_web.getPlayersSummary(registeredFriends.map(rf => rf.id));
        friends_with_names = friend_summaries.map(fs => {
            return {name: fs.personaname, steam_id: fs.steamid};
        });

        const perLenderData: {
            [k: string]: { deviceToken: string | null, borrowerInCurrentShareList: boolean }
        } = await server_user.BorrowsFrom.reduce(async (accum, bf) => {
            if (bf.RefreshToken !== null) {
                const [devices, borrowers] = await withSteamUser(bf.RefreshToken, bf.id, null, async (usr) => {
                    return [await usr.getAuthorizedSharingDevices(), await usr.getAuthorizedBorrowers()];
                });

                const found = devices.devices.find(d =>
                    d.deviceName === getDeviceName(server_user.id)
                );
                const borrowerInCurrentShareList = borrowers
                    .borrowers.some(authborws => authborws.steamid.toString() == server_user.id);
                if (found !== undefined) {
                    return {...accum, [bf.id]: {deviceToken: found.deviceToken, borrowerInCurrentShareList}};
                } else return {...accum, [bf.id]: {deviceToken: null, borrowerInCurrentShareList: false}};
            } else {
                return {...accum, [bf.id]: {deviceToken: null, borrowerInCurrentShareList: false}};
            }
        }, {});


        lenders = server_user.BorrowsFrom.map(lender => {
            return {
                steamId: lender.id,
                name: lenderNames[lender.id],
                isAuthenticated: lender.RefreshToken != null,
                borrowerAuthorizedDeviceToken: perLenderData[lender.id].deviceToken,
                borrowerInCurrentShareList: perLenderData[lender.id].borrowerInCurrentShareList
            };
        });

    }

    return {
        props: {
            sharesProp: shares,
            lendersProp: lenders,
            refresh_token_valid,
            machine_id_valid,
            session: session,
            friendIdList: friends_with_names,
            ...(await serverSideTranslations(context.locale || context.defaultLocale!))
        }
    };
}