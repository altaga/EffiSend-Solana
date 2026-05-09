import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EVMChain } from "../../../classes/evmChain";
import { SolanaChain } from "../../../classes/solanaChain";
import FaceOnboarding from "../../../components/faceOnboarding";
import PassModal from "../../../components/passModal";
import { blockchains, getIcon } from "../../../core/chains";
import { refreshTime } from "../../../core/constants";
import { createGlobalStyles, mainColor } from "../../../core/styles";
import {
  decodeBase64,
  getAsyncStorageValue,
  setAsyncStorageValue,
} from "../../../core/utils";
import ContextModule from "../../../providers/contextModule";
import { useSmartSize } from "../../../providers/smartProvider";

const adapterMap = { evm: EVMChain, solana: SolanaChain };
const TARGET_CHAIN_ID = 143;
const HEDERA_MIRROR_NODE = "https://mainnet-public.mirrornode.hedera.com";
const PASS_CONTRACTS = [
  "0x230EE3018Ff95Ac9386C61cD0C9A0730bcdf1fb1",
  "0xa1fCE64d658623e0B2B3F1b78951cABCBC29770e",
];
const POAP_CONTRACTS = [
  "0xC72dF496B47Efe52048D593238a3A74F344B8482",
  "0x0219D7b4e70DA71fcF0aB889e755b5214f213bF6",
];
const HEDERA_PASS_COLLECTIONS = [];
const HEDERA_POAP_COLLECTIONS = ["0.0.10379860"];

const getCategory = (pass) => {
  if (pass?.isPoap) return "Poap";
  return (
    pass?.attributes?.find((a) => a.trait_type === "Category")?.value ||
    "General"
  );
};

const BADGE_ICON_SIZE = 14;

function Tab5({ navigation, isActive }) {
  const { value, setValue } = useContext(ContextModule);
  const { addresses, nfts } = value;
  const smartSize = useSmartSize();
  const { normalize } = smartSize; const GlobalStyles = createGlobalStyles(smartSize);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const isRefreshingRef = useRef(false);
  const nftsRef = useRef(nfts);

  useEffect(() => {
    nftsRef.current = nfts;
  }, [nfts]);

  const getLastRefresh = async () => {
    try {
      const val = await getAsyncStorageValue("lastRefreshNFTs");
      return val ? Number(val) : 0;
    } catch {
      return 0;
    }
  };

  const fetchPasses = useCallback(
    async (force = false) => {
      if (isRefreshingRef.current) return;
      if (!force) {
        const lastRefresh = await getLastRefresh();
        if (Date.now() - lastRefresh < refreshTime) return;
      }
      isRefreshingRef.current = true;
      setLoading(true);
      try {
        const evmChainConfig = blockchains.find(
          (c) => c.chainId === TARGET_CHAIN_ID,
        );
        const hederaChainConfig = blockchains.find((c) => c.type === "hedera");
        const userAddressEVM = addresses[evmChainConfig?.type];
        const hederaAccountId = addresses.hedera;
        const AdapterClass = adapterMap[evmChainConfig?.type];
        let allMergedNFTs = [];

        if (AdapterClass && userAddressEVM) {
          const adapter = new AdapterClass(evmChainConfig);
          const fetchPassPromises = PASS_CONTRACTS.map((contract) =>
            adapter
              .getNFTs(userAddressEVM, contract)
              .then((res) =>
                (res || []).map((nft) => ({
                  ...nft,
                  isPoap: false,
                  chain: "evm",
                  iconKey: evmChainConfig?.iconKey,
                  chainId: evmChainConfig?.chainId,
                })),
              )
              .catch(() => []),
          );
          const fetchPoapPromises = POAP_CONTRACTS.map((contract) =>
            adapter
              .getNFTs(userAddressEVM, contract)
              .then((res) =>
                (res || []).map((nft) => ({
                  ...nft,
                  isPoap: true,
                  chain: "evm",
                  iconKey: evmChainConfig?.iconKey,
                  chainId: evmChainConfig?.chainId,
                })),
              )
              .catch(() => []),
          );
          const evmResults = await Promise.all([
            ...fetchPassPromises,
            ...fetchPoapPromises,
          ]);
          allMergedNFTs = evmResults.flat().filter(Boolean);
        }

        if (hederaAccountId) {
          const fetchHederaCollection = async (collectionId, isPoap) => {
            try {
              const hRes = await fetch(
                `${HEDERA_MIRROR_NODE}/api/v1/accounts/${hederaAccountId}/nfts?token.id=${collectionId}`,
              );
              if (hRes.status === 404 || !hRes.ok) return [];
              const hData = await hRes.json();
              if (!hData.nfts || hData.nfts.length === 0) return [];
              const parsedNfts = await Promise.all(
                hData.nfts.map(async (nft) => {
                  try {
                    let metadataUrl = decodeBase64(nft.metadata);
                    if (metadataUrl.startsWith("ipfs://"))
                      metadataUrl = metadataUrl.replace(
                        "ipfs://",
                        "https://ipfs.io/ipfs/",
                      );
                    const metaRes = await fetch(metadataUrl);
                    const metaJSON = await metaRes.json();
                    let imageUrl = metaJSON.image || "";
                    if (imageUrl.startsWith("ipfs://"))
                      imageUrl = imageUrl.replace(
                        "ipfs://",
                        "https://ipfs.io/ipfs/",
                      );
                    return {
                      ...metaJSON,
                      image: imageUrl,
                      tokenId: nft.serial_number,
                      contract: nft.token_id,
                      chain: "hedera",
                      iconKey: hederaChainConfig?.iconKey || "hedera",
                      isPoap,
                    };
                  } catch {
                    return null;
                  }
                }),
              );
              return parsedNfts.filter(Boolean);
            } catch {
              return [];
            }
          };
          const hederaResults = await Promise.all([
            ...HEDERA_PASS_COLLECTIONS.map((id) =>
              fetchHederaCollection(id, false),
            ),
            ...HEDERA_POAP_COLLECTIONS.map((id) =>
              fetchHederaCollection(id, true),
            ),
          ]);
          allMergedNFTs = [...allMergedNFTs, ...hederaResults.flat()];
        }

        const solanaChainConfig = blockchains.find((c) => c.type === "solana");
        const userAddressSolana = addresses[solanaChainConfig?.type];
        if (userAddressSolana) {
          const adapter = new SolanaChain(solanaChainConfig);
          const solanaNfts = await adapter.getNFTs(userAddressSolana);
          allMergedNFTs = [
            ...allMergedNFTs,
            ...solanaNfts.map((nft) => ({
              ...nft,
              iconKey: solanaChainConfig?.iconKey,
              chain: "solana",
            })),
          ];
        }

        if (allMergedNFTs.length !== nftsRef.current?.length) {
          setValue({ nfts: allMergedNFTs });
          const initialExpand = {};
          allMergedNFTs.forEach((pass) => {
            initialExpand[getCategory(pass)] = true;
          });
          setExpandedSections(initialExpand);
        }
        await setAsyncStorageValue({
          nfts: allMergedNFTs,
          lastRefreshNFTs: Date.now(),
        });
      } catch (err) {
        console.error("Total Fetch Error:", err);
      } finally {
        setLoading(false);
        isRefreshingRef.current = false;
      }
    },
    [addresses, setValue],
  );

  useEffect(() => {
    if (!isActive) return;
    if (Object.values(addresses).some((a) => a !== "")) fetchPasses();
  }, [addresses, fetchPasses, isActive]);

  const toggleSection = (category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const groupedPasses = useMemo(() => {
    const groups = {};
    (nfts || []).forEach((pass) => {
      const category = getCategory(pass);
      if (!groups[category]) groups[category] = [];
      groups[category].push(pass);
    });
    return groups;
  }, [nfts]);

  if (!Object.values(addresses).some((a) => a !== "")) {
    return (
      <FaceOnboarding onStart={() => navigation.navigate("(screens)/create")} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000", width: smartSize.width, alignSelf: "center" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchPasses(true)}
            tintColor={mainColor}
          />
        }
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: normalize(16),
          paddingTop: normalize(20),
          paddingBottom: normalize(40),
        }}
      >
        <View style={{ marginBottom: normalize(20) }}>
          <Text style={GlobalStyles.passesMainTitle}>My Passes</Text>
        </View>

        {Object.keys(groupedPasses).length === 0 && !loading && (
          <View style={GlobalStyles.emptyContainer}>
            <Ionicons name="layers-outline" size={64} color="#333" />
            <Text style={GlobalStyles.emptyText}>
              No passes or POAPs found yet.
            </Text>
          </View>
        )}

        <View style={{ gap: normalize(12) }}>
          {Object.keys(groupedPasses).map((category) => {
            const isExpanded = expandedSections[category];
            return (
              <View key={category} style={GlobalStyles.sectionContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleSection(category)}
                  style={GlobalStyles.categoryButton}
                >
                  <View style={GlobalStyles.categoryHeaderRow}>
                    <View style={GlobalStyles.categoryIndicator} />
                    <Text style={GlobalStyles.categoryHeader}>{category}</Text>
                    <View style={GlobalStyles.pillBadge}>
                      <Text style={GlobalStyles.badgeText}>
                        {groupedPasses[category].length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={mainColor}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[GlobalStyles.listContainer, { marginTop: normalize(8) }]}>
                    {groupedPasses[category].map((pass, index) => (
                      <TouchableOpacity
                        key={`${pass.contract}-${pass.tokenId}-${index}`}
                        style={GlobalStyles.passCard}
                        onPress={() => {
                          setSelectedPass(pass);
                          setModalVisible(true);
                        }}
                      >
                        <View style={GlobalStyles.imageWrapper}>
                          <Image
                            source={{ uri: pass.image }}
                            style={GlobalStyles.passImage}
                          />
                          {pass.iconKey && (
                            <View style={GlobalStyles.networkBadge}>
                              {getIcon(pass.iconKey, 14)}
                            </View>
                          )}
                        </View>
                        <View style={GlobalStyles.passInfo}>
                          <Text style={GlobalStyles.passName} numberOfLines={1}>
                            {pass.name}
                          </Text>
                          <Text style={GlobalStyles.passMeta}>
                            {pass.chain?.toUpperCase()} • {pass.contract?.slice(0, 6)}...{pass.contract?.slice(-4)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {loading && (!nfts || nfts.length === 0) && (
          <ActivityIndicator
            size="large"
            color={mainColor}
            style={{ marginTop: 50 }}
          />
        )}

        <PassModal
          visible={modalVisible}
          pass={selectedPass}
          address={addresses[selectedPass?.chain] || addresses.evm}
          onClose={() => setModalVisible(false)}
        />
      </ScrollView>
    </View>
  );
}

export default Tab5;
