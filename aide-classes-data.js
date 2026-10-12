/* ============================================================
   DCC Sheet - Resume des classes (Niveau 0 & 7 classes)
   ------------------------------------------------------------
   Contenu extrait de resume_classes_dcc_v4.html (pp. 18, 21-24,
   28-62 de l'edition francaise), re-themee par style.css.
   GENERE PAR SCRIPT (outils externes) : ne pas editer a la main,
   regenerer depuis le HTML source en cas de mise a jour.
   Expose window.DCC_CLASS_HELP = { order, toc, labels, sections }.
   ============================================================ */
(function () {
  'use strict';

  var sections = {
    intro: `
        <h2>Avant de choisir</h2>
        <div class="sub">p. 27 · terminologie et restriction</div>
        <ul>
          <li><b>Semi-humains :</b> elfe, halfelin et nain ne peuvent être choisis que si le métier du personnage au niveau 0 indiquait cette race.</li>
          <li><b>NI</b> = niveau d’incantateur · <b>HFA</b> = dé de haut fait · <b>DD</b> = degré de difficulté · <b>CA</b> = classe d’armure.</li>
          <li><b>Tables de critique :</b> I (la plus douce) → V (la plus violente). Chaque classe utilise son dé et sa table selon son niveau.</li>
        </ul>
    `,
    carac: `
        <h2>Caractéristiques <span class="dv">Table 1-1 · p. 18</span></h2>
        <div class="sub">tirage 3d6 dans l’ordre — Force, Agilité, Endurance, Présence, Intelligence, Chance — sans écarter ni répartir</div>
        <ul>
          <li>Valeur 3-18 → modificateur ci-dessous, appliqué aux jets de chaque classe. Présence = niveau max des sorts du <b>clerc</b> ; Intelligence = nombre et niveau max des sorts du <b>mage</b>.</li>
        </ul>
        <h3>Table 1-1 · modificateurs de caractéristiques</h3>
        <div class="table-wrap"><table class="ref fit compact">
          <tr><th>Carac.</th><th>Mod.</th><th>Sorts de mage connus</th><th>Niv. sort max**</th></tr>
          <tr><td>3</td><td>-3</td><td>Impossible de lancer des sorts</td><td>—</td></tr>
          <tr><td>4</td><td>-2</td><td>-2 sorts*</td><td>1</td></tr>
          <tr><td>5</td><td>-2</td><td>-2 sorts*</td><td>1</td></tr>
          <tr><td>6</td><td>-1</td><td>-1 sort*</td><td>1</td></tr>
          <tr><td>7</td><td>-1</td><td>-1 sort*</td><td>1</td></tr>
          <tr><td>8</td><td>-1</td><td>Pas d’ajustement</td><td>2</td></tr>
          <tr><td>9</td><td>Aucun</td><td>Pas d’ajustement</td><td>2</td></tr>
          <tr><td>10</td><td>Aucun</td><td>Pas d’ajustement</td><td>3</td></tr>
          <tr><td>11</td><td>Aucun</td><td>Pas d’ajustement</td><td>3</td></tr>
          <tr><td>12</td><td>Aucun</td><td>Pas d’ajustement</td><td>4</td></tr>
          <tr><td>13</td><td>+1</td><td>Pas d’ajustement</td><td>4</td></tr>
          <tr><td>14</td><td>+1</td><td>+1 sort</td><td>4</td></tr>
          <tr><td>15</td><td>+1</td><td>+1 sort</td><td>5</td></tr>
          <tr><td>16</td><td>+2</td><td>+1 sort</td><td>5</td></tr>
          <tr><td>17</td><td>+2</td><td>+2 sorts</td><td>5</td></tr>
          <tr><td>18</td><td>+3</td><td>+2 sorts</td><td>5</td></tr>
        </table></div>
        <div class="note">* 1 sort au minimum. ** Basé sur l’Intelligence pour les mages et la Présence pour les clercs.</div>
    `,
    niveau0: `
        <h2>0 · Niveau 0 <span class="dv">Entomoir · 1d4 PV</span></h2>
        <div class="sub">pp. 21-24 · tous débutent niv 0, la plupart meurent oubliés · les survivants choisissent une classe à 10 PX</div>
        <h3>Dotation de départ</h3>
        <ul>
          <li><b>1d4 PV</b> (mod. Endurance) · <b>5d12 pièces de cuivre</b> · <b>0 PX</b> · <b>1 équipement aléatoire</b> (1d24, table 3-4 p. 73) · <b>1 métier aléatoire</b> (d100, table 1-3).</li>
          <li><b>+0</b> au jet d’attaque et à tous les jets de sauvegarde · critique : <b>1d4, table I</b>.</li>
          <li><b>À 10 PX : choix d’une classe.</b> Prévoyez un groupe d’au moins 15 personnages : « s’enrichir sur le dos des morts ».</li>
        </ul>
        <h3>Métier (d100, table 1-3)</h3>
        <ul>
          <li>Le métier donne <b>1 arme maîtrisée + des possessions</b>. Choix libre possible avec l’accord du Juge (arme et possessions thématiques).</li>
          <li><b>Semi-humains :</b> un métier elfe / halfelin / nain impose la classe correspondante au niv 1. Au niv 0 : nains = infravision + mouvement 6 m ; elfes = sensibles au fer + sens surdéveloppés ; halfelins = infravision. Langue raciale + commun, autres langues en montant de niveau.</li>
          <li><b>Armes :</b> le niv 0 maîtrise son arme de métier ; s’il en change, il maîtrise <b>la dernière utilisée</b>. <b>Pas de malus d’arme non maîtrisée au niv 0</b> (sinon mortalité absurde). Au niv 1 : armes de la classe choisie.</li>
        </ul>
        <div class="table-wrap"><table class="ref compact">
          <tr><th>d100</th><th>Métier</th><th>Arme</th><th>Possession</th></tr>
          <tr><td>01</td><td>Alchimiste</td><td>Bâton</td><td>Huile, 1 flasque</td></tr>
          <tr><td>02</td><td>Apiculteur</td><td>Bâton</td><td>Pot de miel</td></tr>
          <tr><td>03</td><td>Apprenti mage</td><td>Dague</td><td>Grimoire noir</td></tr>
          <tr><td>04</td><td>Armurier</td><td>Marteau (= gourdin)</td><td>Heaume en fer</td></tr>
          <tr><td>05</td><td>Astrologue</td><td>Dague</td><td>Longue-vue</td></tr>
          <tr><td>06</td><td>Barbier</td><td>Rasoir (= dague)</td><td>Ciseaux</td></tr>
          <tr><td>07</td><td>Bedeau</td><td>Bâton</td><td>Symbole sacré</td></tr>
          <tr><td>08</td><td>Berger</td><td>Bâton</td><td>Chien**</td></tr>
          <tr><td>09</td><td>Boucher</td><td>Hachoir (= hachette)</td><td>Tranche de viande</td></tr>
          <tr><td>10</td><td>Bouffon</td><td>Fléchette</td><td>Vêtements de soie</td></tr>
          <tr><td>11-13</td><td>Bûcheron</td><td>Hachette</td><td>Fagot de bois</td></tr>
          <tr><td>14</td><td>Chaman</td><td>Masse</td><td>Herbes, 500 g</td></tr>
          <tr><td>15</td><td>Charron</td><td>Gourdin</td><td>Charrette***</td></tr>
          <tr><td>16-17</td><td>Chasseur</td><td>Arc court</td><td>Peau de cerf</td></tr>
          <tr><td>18</td><td>Collecteur d’impôts</td><td>Épée longue</td><td>100 pc</td></tr>
          <tr><td>19</td><td>Contrebandier</td><td>Fronde</td><td>Sac étanche</td></tr>
          <tr><td>20</td><td>Cordier</td><td>Couteau (= dague)</td><td>Corde, 30 m</td></tr>
          <tr><td>21</td><td>Cordonnier</td><td>Poinçon (= dague)</td><td>Chausse-pied</td></tr>
          <tr><td>22</td><td>Coupeur de bourse</td><td>Dague</td><td>Petit coffre</td></tr>
          <tr><td>23</td><td>Diseur de bonne aventure</td><td>Dague</td><td>Jeu de tarot</td></tr>
          <tr><td>24</td><td>Docker</td><td>Perche (= bâton)</td><td>1 livre de JdR en retard</td></tr>
          <tr><td>25</td><td>Dresseur</td><td>Gourdin</td><td>Poney</td></tr>
          <tr><td>26-27</td><td>Écuyer</td><td>Épée longue</td><td>Heaume en acier</td></tr>
          <tr><td>28</td><td>Elfe artisan</td><td>Bâton</td><td>Argile, 500 g</td></tr>
          <tr><td>29</td><td>Elfe avocat</td><td>Plume (= fléchette)</td><td>Livre</td></tr>
          <tr><td>30</td><td>Elfe cirier</td><td>Ciseaux (= dague)</td><td>Chandelles, 20</td></tr>
          <tr><td>31</td><td>Elfe fauconnier</td><td>Dague</td><td>Faucon</td></tr>
          <tr><td>32-33</td><td>Elfe forestier</td><td>Bâton</td><td>Herbes, 500 g</td></tr>
          <tr><td>34</td><td>Elfe navigateur</td><td>Arc court</td><td>Longue-vue</td></tr>
          <tr><td>35-36</td><td>Elfe sage</td><td>Dague</td><td>Parchemin et plume</td></tr>
          <tr><td>37</td><td>Elfe souffleur de verre</td><td>Marteau (= gourdin)</td><td>Perles de verre</td></tr>
          <tr><td>38</td><td>Esclave</td><td>Gourdin</td><td>Caillou bizarre</td></tr>
          <tr><td>39</td><td>Escroc</td><td>Dague</td><td>Cape de qualité</td></tr>
          <tr><td>40</td><td>Excavateur</td><td>Pelle (= bâton)</td><td>Poussière, 500 g</td></tr>
          <tr><td>41-49</td><td>Fermier*</td><td>Fourche (= lance)</td><td>Poule**</td></tr>
          <tr><td>50</td><td>Forgeron</td><td>Marteau (= gourdin)</td><td>Pinces en acier</td></tr>
          <tr><td>51-52</td><td>Fossoyeur</td><td>Pelle (= bâton)</td><td>Truelle</td></tr>
          <tr><td>53</td><td>Fromager</td><td>Matraque (= bâton)</td><td>Fromage puant</td></tr>
          <tr><td>54</td><td>Gamin des rues</td><td>Bout de bois (= gourdin)</td><td>Sébile</td></tr>
          <tr><td>55</td><td>Garde de caravane</td><td>Épée courte</td><td>Drap, 1 m</td></tr>
          <tr><td>56</td><td>Guérisseur</td><td>Gourdin</td><td>Eau bénite, 1 fiole</td></tr>
          <tr><td>57</td><td>Halfelin bohémien</td><td>Fronde</td><td>Poupée vaudou</td></tr>
          <tr><td>58</td><td>Halfelin gantier</td><td>Poinçon (= dague)</td><td>Gants, 4 paires</td></tr>
          <tr><td>59</td><td>Halfelin marin</td><td>Couteau (= dague)</td><td>Voile, 2 m</td></tr>
          <tr><td>60</td><td>Halfelin mercier</td><td>Ciseaux (= dague)</td><td>Costumes, 3</td></tr>
          <tr><td>61</td><td>Halfelin négociant</td><td>Épée courte</td><td>20 pa</td></tr>
          <tr><td>62-63</td><td>Halfelin teinturier</td><td>Bâton</td><td>Tissu, 3 m</td></tr>
          <tr><td>64</td><td>Halfelin usurier</td><td>Épée courte</td><td>5 po, 10 pa, 200 pc</td></tr>
          <tr><td>65</td><td>Halfelin vagabond</td><td>Gourdin</td><td>Coupelle de mendiant</td></tr>
          <tr><td>66</td><td>Halfelin volailler</td><td>Hachette</td><td>Poulet, 2 kg</td></tr>
          <tr><td>67</td><td>Herboriste</td><td>Gourdin</td><td>Herbes, 500 g</td></tr>
          <tr><td>68</td><td>Hors-la-loi</td><td>Épée courte</td><td>Armure de cuir</td></tr>
          <tr><td>69</td><td>Joaillier</td><td>Dague</td><td>Gemmes, 20 po</td></tr>
          <tr><td>70</td><td>Joueur</td><td>Gourdin</td><td>Dés</td></tr>
          <tr><td>71</td><td>Maraîcher</td><td>Couteau (= dague)</td><td>Fruit</td></tr>
          <tr><td>72</td><td>Marchand</td><td>Dague</td><td>4 po, 14 pa, 27 pc</td></tr>
          <tr><td>73</td><td>Mendiant</td><td>Gourdin</td><td>Fromage</td></tr>
          <tr><td>74-75</td><td>Mendiant de guilde</td><td>Fronde</td><td>Béquilles</td></tr>
          <tr><td>76</td><td>Ménestrel</td><td>Dague</td><td>Ukulélé</td></tr>
          <tr><td>77</td><td>Mercenaire</td><td>Épée longue</td><td>Armure de peau</td></tr>
          <tr><td>78</td><td>Meunier/Boulanger</td><td>Gourdin</td><td>Farine, 500 g</td></tr>
          <tr><td>79</td><td>Nain apothicaire</td><td>Matraque (= bâton)</td><td>Flacon en acier</td></tr>
          <tr><td>80</td><td>Nain coffretier</td><td>Burin (= dague)</td><td>Bois, 5 kg</td></tr>
          <tr><td>81</td><td>Nain éleveur</td><td>Bâton</td><td>Truie**</td></tr>
          <tr><td>82</td><td>Nain forgeron</td><td>Marteau (= gourdin)</td><td>Mithril, 30 g</td></tr>
          <tr><td>83-84</td><td>Nain maçon</td><td>Marteau</td><td>Pierre, 5 kg</td></tr>
          <tr><td>85-86</td><td>Nain mineur</td><td>Pioche (= gourdin)</td><td>Lanterne</td></tr>
          <tr><td>87</td><td>Nain myciculteur</td><td>Pelle (= bâton)</td><td>Sacoche</td></tr>
          <tr><td>88</td><td>Nain ratier</td><td>Gourdin</td><td>Filet</td></tr>
          <tr><td>89</td><td>Noble</td><td>Épée longue</td><td>Anneau d’or, 10 po</td></tr>
          <tr><td>90</td><td>Orphelin</td><td>Gourdin</td><td>Poupée de chiffon</td></tr>
          <tr><td>91</td><td>Palefrenier</td><td>Bâton</td><td>Bride</td></tr>
          <tr><td>92</td><td>Scribe</td><td>Fléchette</td><td>Parchemin, 10 feuilles</td></tr>
          <tr><td>93</td><td>Serrurier</td><td>Dague</td><td>Outils de précision</td></tr>
          <tr><td>94</td><td>Serviteur</td><td>Bâton</td><td>Médaillon</td></tr>
          <tr><td>95</td><td>Soldat</td><td>Lance</td><td>Bouclier</td></tr>
          <tr><td>96</td><td>Tisserand</td><td>Dague</td><td>Vêtements de qualité</td></tr>
          <tr><td>97</td><td>Tonnelier</td><td>Pied-de-biche (= gourdin)</td><td>Tonneau</td></tr>
          <tr><td>98-99</td><td>Trappeur</td><td>Fronde</td><td>Fourrure de blaireau</td></tr>
          <tr><td>100</td><td>Vidangeur de latrines</td><td>Truelle (= dague)</td><td>Sac d’excréments</td></tr>
        </table></div>
        <div class="note"><b>Légende table 1-3 :</b> † projectiles (fronde, fléchettes) = 1d6 munitions · * fermier = 1d8 culture (patate, blé, navet, maïs, riz, panais, radis, rutabaga) · ** chaque animal au-delà du 1er (si plusieurs fermiers/bergers) = 1d6 (mouton, chèvre, vache, canard, oie, mule) · *** charrette = 1d6 (tomates, rien, paille, vos morts, terre, cailloux).</div>
        <h3>Alignement (choisi au niv 0, définitif)</h3>
        <ul>
          <li><b>Loyal :</b> unité, ordre, autorité, loyauté, charité ; « faire le bien » ; choix de l’humanité contre la domination surnaturelle. Haut niveau : célestes, anges, demi-dieux, Seigneurs de la Loi.</li>
          <li><b>Chaotique :</b> entropie, pouvoir et réussite personnels ; alliances surnaturelles même au prix de la primauté de l’homme. Haut niveau : démons, diables, monstres, Seigneurs du Chaos.</li>
          <li><b>Neutre :</b> équilibre, opportunisme au cas par cas (voire indifférence, ou foi pré-divine : Grands Anciens, Cthulhu, Vide). Haut niveau : élémentaires, non-morts extraplanaires, créatures astrales et éthérées.</li>
          <li>Le conflit Loi/Chaos est réel et vos actes renforcent ces puissances : <b>choix d’autant plus important que vous gagnez en puissance</b>.</li>
        </ul>
    `,
    clerc: `
        <h2>1 · Clerc <span class="dv">PV : 1d8 / niveau</span></h2>
        <div class="sub">pp. 28-32 · prêcheur armé · magie divine · toute armure sans pénalité</div>
        <h3>Dieu, alignement, armes</h3>
        <ul>
          <li><b>Choix du dieu au niveau 1</b>, du même alignement que le clerc. <b>Changer d’alignement = perte des sorts et pouvoirs.</b></li>
          <li><b>Loi :</b> Shul (Lune), Klazath (Guerre), Ulesh (Paix), Choranus (Création), Daenthar (Terre/Labeur), Gorhan (Courage), Justicia (Justice), Aristemis (Stratégie). Armes : bâton, fronde, gourdin, masse, marteau. Impies : morts-vivants, démons, diables, extraplanaires chaotiques, monstres, avatars du Chaos, humanoïdes chaotiques, dragons chaotiques.</li>
          <li><b>Neutralité :</b> Amun Tor (Mystères), Ildavir (Nature), Pelagia (Mer), Cthulhu (Grands Anciens). Armes : bâton, dague, épées (toutes), fronde, masse. Impies : animaux, morts-vivants, démons, diables, monstres, lycanthropes, corruptions de la nature.</li>
          <li><b>Chaos :</b> Ahriman (Mort), Seigneur Caché (Secrets), Azi Dahaka (Tempêtes), Bobugbubilz (Amphibiens), Cadixtat (Chaos), Nimlurun (Souillure), Malotoch (corneille noire). Armes : arcs (tous), dague, fléau, fléchette, haches (toutes). Impies : anges, paladins, dragons loyaux, seigneurs et avatars de la Loi, humanoïdes loyaux.</li>
          <li><b>NI</b> = niveau de clerc en général ; reliques saintes peuvent l’augmenter.</li>
        </ul>
        <h3>Magie divine et défaveur</h3>
        <ul>
          <li><b>Incantation :</b> 1d20 + Présence + NI (p. 106). Succès = effet favorable (pas toujours littéral) ; échec = risque de <b>défaveur</b>.</li>
          <li><b>1 naturel</b> = échec auto + jet table 5-7 Défaveur (p. 122).</li>
          <li><b>Chaque échec du jour élargit la plage :</b> 1, puis 1-2, 1-3… même un jet normalement réussi échoue. Retour à 1 chaque matin (sauf abus caractérisé).</li>
          <li><b>Sacrifices :</b> ≥ 1 tour, hors combat, biens détruits ou donnés au temple. <b>50 po = −1 point</b> de défaveur (le 1 naturel reste toujours un échec). Haut fait ou quête = sacrifice au gré du Juge.</li>
          <li><b>Péché</b> (contre alignement, commandements, soigner un opposé ou un rival, frivolité…) : +1 (mineur) à +10 (grave), signes visibles.</li>
        </ul>
        <h3>Pouvoirs</h3>
        <ul>
          <li><b>Repousser les impies</b> (p. 96) : symbole brandi, 1d20 + Prés + NI + Chance. Échec = défaveur.</li>
          <li><b>Imposition des mains :</b> toucher + 1 action. Dés de soin = type du DV de la cible, <b>plafonnés au niveau/DV de la cible</b>. Soin d’états (sans plafond) : membre 1 dé, organe/maladie 2, paralysie/poison 3, cécité/surdité 4. Excédent perdu.</li>
          <li><b>Aide divine :</b> intervention directe, <b>+10 défaveur cumulative</b>. DD 10 (allumer une bougie) à 18+ (colonne de flammes).</li>
          <li><b>Chance</b> → repousser les impies. <b>Dé d’action</b> → attaque <i>ou</i> incantation.</li>
        </ul>
        <div class="table-wrap"><table class="ref fit">
          <tr><th>Test</th><th>Même align.</th><th>Adjacent</th><th>Opposé*</th></tr>
          <tr><td>1-11</td><td>Échec</td><td>Échec</td><td>Échec</td></tr>
          <tr><td>12-13</td><td>2 dés</td><td>1 dé</td><td>1 dé</td></tr>
          <tr><td>14-19</td><td>3 dés</td><td>2 dés</td><td>1 dé</td></tr>
          <tr><td>20-21</td><td>4 dés</td><td>3 dés</td><td>2 dés</td></tr>
          <tr><td>22+</td><td>5 dés</td><td>4 dés</td><td>3 dés</td></tr>
        </table></div>
        <div class="note">* Opposé (Loyal↔Chaotique, dieux rivaux) = presque toujours un péché.</div>
        <h3>Table 1-5 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>Att.</th><th>Critique</th><th>Action</th><th>Réf</th><th>Vig</th><th>Vol</th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>S5</th></tr>
          <tr><td>1</td><td>+0</td><td>1d8/III</td><td>1d20</td><td>+0</td><td>+1</td><td>+1</td><td>4</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>
          <tr><td>2</td><td>+1</td><td>1d8/III</td><td>1d20</td><td>+0</td><td>+1</td><td>+1</td><td>5</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>
          <tr><td>3</td><td>+2</td><td>1d10/III</td><td>1d20</td><td>+1</td><td>+1</td><td>+2</td><td>5</td><td>3</td><td>–</td><td>–</td><td>–</td></tr>
          <tr><td>4</td><td>+2</td><td>1d10/III</td><td>1d20</td><td>+1</td><td>+2</td><td>+2</td><td>6</td><td>4</td><td>–</td><td>–</td><td>–</td></tr>
          <tr><td>5</td><td>+3</td><td>1d12/III</td><td>1d20</td><td>+1</td><td>+2</td><td>+3</td><td>6</td><td>5</td><td>2</td><td>–</td><td>–</td></tr>
          <tr><td>6</td><td>+4</td><td>1d12/III</td><td>1d20+1d14</td><td>+2</td><td>+2</td><td>+4</td><td>7</td><td>5</td><td>3</td><td>–</td><td>–</td></tr>
          <tr><td>7</td><td>+5</td><td>1d14/III</td><td>1d20+1d16</td><td>+2</td><td>+3</td><td>+4</td><td>7</td><td>6</td><td>4</td><td>1</td><td>–</td></tr>
          <tr><td>8</td><td>+5</td><td>1d14/III</td><td>1d20+1d20</td><td>+2</td><td>+3</td><td>+5</td><td>8</td><td>6</td><td>5</td><td>2</td><td>–</td></tr>
          <tr><td>9</td><td>+6</td><td>1d16/III</td><td>1d20+1d20</td><td>+3</td><td>+3</td><td>+5</td><td>8</td><td>7</td><td>5</td><td>3</td><td>1</td></tr>
          <tr><td>10</td><td>+7</td><td>1d16/III</td><td>1d20+1d20</td><td>+3</td><td>+4</td><td>+6</td><td>9</td><td>7</td><td>6</td><td>4</td><td>2</td></tr>
        </table></div>
        <h3>Table 1-6 · titres (niv 1-5)</h3>
        <ul>
          <li><b>Loyal :</b> Acolyte, Pourfendeur de païens, Frère, Vicaire, Père.</li>
          <li><b>Chaotique :</b> Fanatique, Converti, Cultiste, Apôtre, Grand prêtre.</li>
          <li><b>Neutre :</b> Témoin, Pupille, Chroniqueur, Juge, Druide.</li>
        </ul>
    `,
    guerrier: `
        <h2>2 · Guerrier <span class="dv">PV : 1d12 / niveau</span></h2>
        <div class="sub">pp. 34-36 · toutes armes et armures · Initiative + niveau</div>
        <ul>
          <li><b>Armes :</b> arbalète, arcs, armes d’hast, bâton, dague, épées (2 mains, courte, longue), fléchette, fléau, fronde, gourdin, haches, javelot, lances, marteau, masse. Toute armure.</li>
          <li><b>Profils :</b> loyaux = royaux · chaotiques = sans-loi · neutres/chaotiques = sauvages · tous = mercenaires.</li>
          <li><b>Dé de haut fait (HFA) :</b> pas de bonus fixe. <b>Chaque round</b>, lancez le dé HFA et ajoutez-le à <b>chaque jet d’attaque ET aux dégâts</b>. d3 (1) → d4 → d5 → d6 → d7 (5) → d8 → d10+1 → d10+2 → d10+3 → d10+4 (10).</li>
          <li><b>Haut fait d’armes</b> (p. 88) : prouesse annoncée avant l’attaque (désarmer, aveugler, repousser, trébucher, viser la visière…). <b>Réussi si dé HFA ≥ 3 ET attaque ≥ CA</b>, sinon attaque normale.</li>
          <li><b>Critiques :</b> menace 19-20 (niv 1-4), 18-20 (niv 5-8), 17-20 (niv 9-10). Dé et tables les plus violents (voir table).</li>
          <li><b>Chance (niv 1) :</b> mod. figé sur <b>un seul type d’arme précis</b> (« épée longue »), pour toute la carrière.</li>
          <li><b>Dés d’action :</b> toujours pour attaquer. <b>2ᵉ attaque dès le niv 5.</b></li>
        </ul>
        <h3>Table 1-7 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>HFA*</th><th>Critique</th><th>Menace</th><th>Action</th><th>Réf</th><th>Vig</th><th>Vol</th></tr>
          <tr><td>1</td><td>+d3</td><td>1d12/III</td><td>19-20</td><td>1d20</td><td>+1</td><td>+1</td><td>+0</td></tr>
          <tr><td>2</td><td>+d4</td><td>1d14/III</td><td>19-20</td><td>1d20</td><td>+1</td><td>+1</td><td>+0</td></tr>
          <tr><td>3</td><td>+d5</td><td>1d16/IV</td><td>19-20</td><td>1d20</td><td>+1</td><td>+2</td><td>+1</td></tr>
          <tr><td>4</td><td>+d6</td><td>1d20/IV</td><td>19-20</td><td>1d20</td><td>+2</td><td>+2</td><td>+1</td></tr>
          <tr><td>5</td><td>+d7</td><td>1d24/V</td><td>18-20</td><td>1d20+1d14</td><td>+2</td><td>+3</td><td>+1</td></tr>
          <tr><td>6</td><td>+d8</td><td>1d30/V</td><td>18-20</td><td>1d20+1d16</td><td>+2</td><td>+4</td><td>+2</td></tr>
          <tr><td>7</td><td>+d10+1</td><td>1d30/V</td><td>18-20</td><td>1d20+1d20</td><td>+3</td><td>+4</td><td>+2</td></tr>
          <tr><td>8</td><td>+d10+2</td><td>2d20/V</td><td>18-20</td><td>1d20+1d20</td><td>+3</td><td>+5</td><td>+2</td></tr>
          <tr><td>9</td><td>+d10+3</td><td>2d20/V</td><td>17-20</td><td>1d20+1d20</td><td>+3</td><td>+5</td><td>+3</td></tr>
          <tr><td>10</td><td>+d10+4</td><td>2d20/V</td><td>17-20</td><td>1d20+1d20+1d14</td><td>+4</td><td>+6</td><td>+3</td></tr>
        </table></div>
        <div class="note">* Relancé chaque round, appliqué à l’attaque et aux dégâts. À haut niveau : dé + valeur fixe.</div>
        <h3>Table 1-8 · titres (niv 1-5)</h3>
        <ul>
          <li><b>Loyal :</b> Écuyer, Champion, Chevalier, Cavalier, Paladin.</li>
          <li><b>Chaotique :</b> Bandit, Brigand, Maraudeur, Ravageur, Saccageur.</li>
          <li><b>Neutre :</b> Sauvage, Barbare, Berserker, Chef, Chef de clan.</li>
        </ul>
    `,
    mage: `
        <h2>3 · Mage <span class="dv">PV : 1d4 / niveau</span></h2>
        <div class="sub">pp. 40-42 · magie arcanique dangereuse · armure = gêne d’incantation</div>
        <ul>
          <li><b>Armes :</b> arcs court/long, bâton, dague, épées courte/longue. Rarement d’armure. Chaotiques = magie noire ; loyaux/neutres = éléments ; enchantements pour tous.</li>
          <li><b>Sorts :</b> 4 connus au niv 1 (années d’étude), tirés aléatoirement (ch. 5), modifiés par l’Intelligence. Niveau max lançable : 1 (niv 1-2), 2 (3-4), 3 (5-6), 4 (7-8), 5 (9-10). Puissant mais risqué.</li>
          <li><b>Incantation :</b> 1d20 + Intelligence + NI (NI = niveau). La <b>magie mercurielle</b> (p. 111) peut améliorer ou dégrader le dé. Échec = corruption, revers, manifestations.</li>
          <li><b>Patron surnaturel :</b> <i>invoquer un patron</i> exige <b>brûlesort ≥ 1 pt de carac.</b> (p. 107) + contrepartie possible (babiole, nom secret, sacrifice, quête). À réserver aux extrêmes. Courants : Bobugbubilz, Azi Dahaka, Roi des Terres elfiques, Sezrekan, Trois Grées, Yddgrrl, Obitu-Que, Ithha.</li>
          <li><b>Familiers :</b> via <i>appel de familier</i> (chat noir, serpent, homoncule…).</li>
          <li><b>Chance</b> → corruption + magie mercurielle. <b>Langues :</b> +2 par point de mod. Int (annexe L).</li>
          <li><b>Dés d’action :</b> 1ᵉʳ = attaque <i>ou</i> sort ; 2ᵉ (niv 5+) = sort uniquement → <b>2 sorts/round</b> (1d20 + 1d14…).</li>
        </ul>
        <h3>Table 1-9 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>Att.</th><th>Critique</th><th>Action</th><th>Connus</th><th>Max</th><th>Réf</th><th>Vig</th><th>Vol</th></tr>
          <tr><td>1</td><td>+0</td><td>1d6/I</td><td>1d20</td><td>4</td><td>1</td><td>+1</td><td>+0</td><td>+1</td></tr>
          <tr><td>2</td><td>+1</td><td>1d6/I</td><td>1d20</td><td>5</td><td>1</td><td>+1</td><td>+0</td><td>+1</td></tr>
          <tr><td>3</td><td>+1</td><td>1d8/I</td><td>1d20</td><td>6</td><td>2</td><td>+1</td><td>+1</td><td>+2</td></tr>
          <tr><td>4</td><td>+1</td><td>1d8/I</td><td>1d20</td><td>7</td><td>2</td><td>+2</td><td>+1</td><td>+2</td></tr>
          <tr><td>5</td><td>+2</td><td>1d10/I</td><td>1d20+1d14</td><td>8</td><td>3</td><td>+2</td><td>+1</td><td>+3</td></tr>
          <tr><td>6</td><td>+2</td><td>1d10/I</td><td>1d20+1d16</td><td>9</td><td>3</td><td>+2</td><td>+2</td><td>+4</td></tr>
          <tr><td>7</td><td>+3</td><td>1d12/I</td><td>1d20+1d20</td><td>10</td><td>4</td><td>+3</td><td>+2</td><td>+4</td></tr>
          <tr><td>8</td><td>+3</td><td>1d12/I</td><td>1d20+1d20</td><td>12</td><td>4</td><td>+3</td><td>+2</td><td>+5</td></tr>
          <tr><td>9</td><td>+4</td><td>1d14/I</td><td>1d20+1d20</td><td>14</td><td>5</td><td>+3</td><td>+3</td><td>+5</td></tr>
          <tr><td>10</td><td>+4</td><td>1d14/I</td><td>1d20+1d20+1d14</td><td>16</td><td>5</td><td>+4</td><td>+3</td><td>+6</td></tr>
        </table></div>
        <h3>Table 1-10 · titres (niv 1-5)</h3>
        <ul>
          <li><b>Chaotique :</b> Cultiste, Chaman, Diaboliste, Sorcier, Nécromancien.</li>
          <li><b>Loyal :</b> Évocateur, Contrôleur, Conjurateur, Invocateur, Élémentaliste.</li>
          <li><b>Neutre :</b> Astrologue, Enchanteur, Mage, Thaumaturge, Ensorceleur.</li>
        </ul>
    `,
    voleur: `
        <h2>4 · Voleur <span class="dv">PV : 1d6 / niveau</span></h2>
        <div class="sub">pp. 44-48 · ruse et discrétion · argot oral secret (le révéler = mort)</div>
        <ul>
          <li><b>Armes :</b> arbalète, bâton, dague, épées courte/longue, fléchette, fronde, garrot, matraque, sarbacane. Armure légère de préférence (pénalise les compétences).</li>
          <li><b>Voies :</b> Loyaux = Boss (crime organisé) · Chaotiques = Assassin (indépendants) · Neutres = Escroc (doubles-jeux). La voie fixe la progression des compétences.</li>
          <li><b>Compétences :</b> 1d20 + bonus (table 1-13) + mod. Agi*/Int†/Prés‡ ≥ DD. DD 5 (facile) → 20 (extrême), 25+ (serrures légendaires). <b>Outils de voleur requis</b> (crochetage, pièges, escalade, faux, poisons). Le Juge peut jeter en secret (faux, déguisement).</li>
          <li><b>Attaque sournoise :</b> par-derrière ou surprise → +bonus + <b>critique automatique</b> (table II, p. 47). Souvent préparée par Silence + Ombre. Uniquement contre anatomies vulnérables ; armes fines = dégâts bonus.</li>
          <li><b>DD de référence :</b> Silence 5 (herbe) / 10 (pierre) / 15 (parquet) / 20 (feuilles, eau, gravier) — <b>jamais en opposition</b>, réussite = indétectable sauf magie. Ombre 5 (nuit) / 10 (lune, couloir) / 15 (jour à couvert) / 20 (plein jour à découvert). Tire 5 (sans méfiance) → 20 (sur ses gardes). Murs 10 (pierre) / 20 (lisse). Crochetage 10 / 20 / 25+. Pièges visibles 10, subtils 15-20+ (<b>1 naturel = déclenché</b>). Faux 5-20. Déguisement 5 (même race) / 10 (visage) / 15 (manières, taille) / 20+ (proche). Langues 10 (simple) / 15 (complexe).</li>
          <li><b>Poisons :</b> DD 10 à chaque application (échec = auto-empoisonné) ; 1 naturel sur attaque empoisonnée = auto-empoisonné + maladresse.</li>
          <li><b>Parchemin :</b> test normal mais dé réduit (voir table), <b>sans brûlesort</b>.</li>
          <li><b>Chance &amp; ruse :</b> brûler = +1 dé de chance par pt (ex. niv 2 = +2d4 pour 2 pts). <b>Récup +niveau / nuit</b> sans dépasser le max. Dé d’action polyvalent.</li>
        </ul>
        <h3>Table 1-11 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>Att.</th><th>Critique</th><th>Action</th><th>Dé Chance</th><th>Réf</th><th>Vig</th><th>Vol</th></tr>
          <tr><td>1</td><td>+0</td><td>1d10/II</td><td>1d20</td><td>d3</td><td>+1</td><td>+1</td><td>+0</td></tr>
          <tr><td>2</td><td>+1</td><td>1d12/II</td><td>1d20</td><td>d4</td><td>+1</td><td>+1</td><td>+0</td></tr>
          <tr><td>3</td><td>+2</td><td>1d14/II</td><td>1d20</td><td>d5</td><td>+2</td><td>+1</td><td>+1</td></tr>
          <tr><td>4</td><td>+2</td><td>1d16/II</td><td>1d20</td><td>d6</td><td>+2</td><td>+2</td><td>+1</td></tr>
          <tr><td>5</td><td>+3</td><td>1d20/II</td><td>1d20</td><td>d7</td><td>+3</td><td>+2</td><td>+1</td></tr>
          <tr><td>6</td><td>+4</td><td>1d24/II</td><td>1d20+1d14</td><td>d8</td><td>+4</td><td>+2</td><td>+2</td></tr>
          <tr><td>7</td><td>+5</td><td>1d30/II</td><td>1d20+1d16</td><td>d10</td><td>+4</td><td>+3</td><td>+2</td></tr>
          <tr><td>8</td><td>+5</td><td>1d30+2/II</td><td>1d20+1d20</td><td>d12</td><td>+5</td><td>+3</td><td>+2</td></tr>
          <tr><td>9</td><td>+6</td><td>1d30+4/II</td><td>1d20+1d20</td><td>d14</td><td>+5</td><td>+3</td><td>+3</td></tr>
          <tr><td>10</td><td>+7</td><td>1d30+6/II</td><td>1d20+1d20</td><td>d16</td><td>+6</td><td>+4</td><td>+3</td></tr>
        </table></div>
        <h3>Table 1-13 · compétences par voie et niveau</h3>
        <div class="note">* +mod. Agi · † +mod. Int · ‡ +mod. Présence.</div>
        <h3>Voie du Boss (loyaux)</h3>
        <div class="table-wrap"><table class="ref compact">
          <tr><th>Compétence</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th></tr>
          <tr><td>Attaque sournoise</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Déplacement silencieux*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Se cacher dans l’ombre*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Vol à la tire*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Escalader*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Crocheter*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Détecter pièges†</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Désamorcer*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Falsifier*</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Déguiser‡</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Lire langues†</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Poisons</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Parchemin†</td><td>d10</td><td>d10</td><td>d12</td><td>d12</td><td>d14</td><td>d14</td><td>d16</td><td>d16</td><td>d20</td><td>d20</td></tr>
        </table></div>
        <h3>Voie de l’Assassin (chaotiques)</h3>
        <div class="table-wrap"><table class="ref compact">
          <tr><th>Compétence</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th></tr>
          <tr><td>Attaque sournoise</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Déplacement silencieux*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Se cacher dans l’ombre*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Vol à la tire*</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Escalader*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Crocheter*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Détecter pièges†</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Désamorcer*</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Falsifier*</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Déguiser‡</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Lire langues†</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Poisons</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Parchemin†</td><td>d10</td><td>d10</td><td>d12</td><td>d12</td><td>d14</td><td>d14</td><td>d16</td><td>d16</td><td>d20</td><td>d20</td></tr>
        </table></div>
        <h3>Voie de l’Escroc (neutres)</h3>
        <div class="table-wrap"><table class="ref compact">
          <tr><th>Compétence</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th></tr>
          <tr><td>Attaque sournoise</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Déplacement silencieux*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Se cacher dans l’ombre*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Vol à la tire*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Escalader*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Crocheter*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Détecter pièges†</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Désamorcer*</td><td>+1</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+10</td><td>+11</td><td>+12</td><td>+13</td></tr>
          <tr><td>Falsifier*</td><td>+3</td><td>+5</td><td>+7</td><td>+8</td><td>+9</td><td>+11</td><td>+12</td><td>+13</td><td>+14</td><td>+15</td></tr>
          <tr><td>Déguiser‡</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Lire langues†</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td><td>+9</td></tr>
          <tr><td>Poisons</td><td>+0</td><td>+0</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+5</td><td>+6</td><td>+7</td><td>+8</td></tr>
          <tr><td>Parchemin†</td><td>d12</td><td>d12</td><td>d14</td><td>d14</td><td>d16</td><td>d16</td><td>d20</td><td>d20</td><td>d20</td><td>d20</td></tr>
        </table></div>
        <h3>Table 1-12 · titres (niv 1-5)</h3>
        <ul>
          <li><b>Loyal :</b> Spadassin, Apprenti, Roublard, Capo, Boss.</li>
          <li><b>Chaotique :</b> Voyou, Meurtrier, Coupe-gorge, Bourreau, Assassin.</li>
          <li><b>Neutre :</b> Mendiant, Tire-Laine, Cambrioleur, Bandit, Escroc.</li>
        </ul>
        <div class="note"><b>Légende table 1-13 :</b> * = ajouter le modificateur d’Agilité · † = ajouter le modificateur d’Intelligence · ‡ = ajouter le modificateur de Présence.</div>
    `,
    elfe: `
        <h2>5 · Elfe <span class="dv">PV : 1d6 / niveau</span></h2>
        <div class="sub">pp. 52-54 · guerrier-mage millénaire · castes (bois, plaines, mers, nuages, déchus)</div>
        <ul>
          <li><b>Profil :</b> cités elfiques, maturité lente, maîtrise inégalable. Aventuriers = chercheurs de relique, objet divin ou arme légendaire. Plutôt chaotiques ou neutres, rarement loyaux.</li>
          <li><b>Armes :</b> arcs court/long, bâton, dague, épées (2 mains, courte, longue), javelot, lance. <b>Niv 1 : 1 armure + 1 arme en mithril gratuites</b> (légères, sans gêne).</li>
          <li><b>Magie :</b> arcanique, orientée élémentaires/démons, puissance tutélaire extraplanaire. Sorts tirés comme le mage, NI = niveau. <b><i>Lier + invoquer un patron</i> gratuits au niv 1</b> (alliances séculaires).</li>
          <li><b>Atouts :</b> infravision 18 m · immunisé <b>sommeil magique + paralysie</b> · <b>vulnérable au fer</b> (brûlure, 1 dmg/jour de contact continu, pas d’armure/arme en fer durable).</li>
          <li><b>Sens :</b> <b>+4 passages secrets</b> + jet automatique si passage à moins de 3 m.</li>
          <li><b>Chance (niv 1) :</b> mod. figé sur <b>1 sort au choix</b>. <b>Langues :</b> commun + elfe + 1, +1 / mod. Int (dialectes, annexe L).</li>
          <li><b>Dé d’action :</b> attaque <i>ou</i> incantation à tout niveau. Niv 5 : 2 sorts (d20+d14), 2 attaques, ou attaque + sort. Magie mercurielle prioritaire.</li>
        </ul>
        <h3>Table 1-14 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>Att.</th><th>Critique</th><th>Action</th><th>Connus*</th><th>Max</th><th>Réf</th><th>Vig</th><th>Vol</th></tr>
          <tr><td>1</td><td>+1</td><td>1d6/II</td><td>1d20</td><td>3</td><td>1</td><td>+1</td><td>+1</td><td>+1</td></tr>
          <tr><td>2</td><td>+1</td><td>1d8/II</td><td>1d20</td><td>4</td><td>1</td><td>+1</td><td>+1</td><td>+1</td></tr>
          <tr><td>3</td><td>+2</td><td>1d8/II</td><td>1d20</td><td>5</td><td>2</td><td>+1</td><td>+1</td><td>+2</td></tr>
          <tr><td>4</td><td>+2</td><td>1d10/II</td><td>1d20</td><td>6</td><td>2</td><td>+2</td><td>+2</td><td>+2</td></tr>
          <tr><td>5</td><td>+3</td><td>1d10/II</td><td>1d20+1d14</td><td>7</td><td>3</td><td>+2</td><td>+2</td><td>+3</td></tr>
          <tr><td>6</td><td>+3</td><td>1d12/II</td><td>1d20+1d16</td><td>8</td><td>3</td><td>+2</td><td>+2</td><td>+4</td></tr>
          <tr><td>7</td><td>+4</td><td>1d12/II</td><td>1d20+1d20</td><td>9</td><td>4</td><td>+3</td><td>+3</td><td>+4</td></tr>
          <tr><td>8</td><td>+4</td><td>1d14/II</td><td>1d20+1d20</td><td>10</td><td>4</td><td>+3</td><td>+3</td><td>+5</td></tr>
          <tr><td>9</td><td>+5</td><td>1d14/II</td><td>1d20+1d20</td><td>12</td><td>5</td><td>+3</td><td>+3</td><td>+5</td></tr>
          <tr><td>10</td><td>+5</td><td>1d16/II</td><td>1d20+1d20+1d14</td><td>14</td><td>5</td><td>+4</td><td>+4</td><td>+6</td></tr>
        </table></div>
        <div class="note">* + <i>lier un patron</i> et <i>invoquer un patron</i>. Titres uniques (niv 1-5) : Vagabond, Devin, Quêteur, Savant, Ancien.</div>
    `,
    halfelin: `
        <h2>6 · Halfelin <span class="dv">PV : 1d6 / niveau</span></h2>
        <div class="sub">pp. 56-58 · petit (60 cm-1,20 m, ≤ 35 kg) · 6 m de mouvement · loyaux, parfois neutres</div>
        <ul>
          <li><b>Profil :</b> fermiers, jardiniers, brasseurs… Aventuriers = commerçants ou bons à rien embarqués dans les affaires des « grandes gens ».</li>
          <li><b>Armes :</b> arbalète, arc court, bâton, dague, épée courte, fronde, gourdin, hachette, javelot. Une arme dans chaque main de préférence ; armure fréquente.</li>
          <li><b>Combat à deux armes :</b> Agi comptée <b>minimum 16</b> → 2 attaques à −1 dé sur la chaîne (typ. 2×1d16). Deux armes à 1 main de taille égale autorisées. <b>Critique + succès auto sur 16 naturel.</b> <b>Maladresse seulement sur double 1.</b> Si Agi &gt; 16 : règles normales (p. 94-95).</li>
          <li><b>Petite taille :</b> se faufile dans passages étroits et minuscules. <b>Lenteur :</b> 6 m au lieu de 9 m.</li>
          <li><b>Discrétion (comme voleur) :</b> Silence + Ombre : +3 (1), +5 (2), +7 (3), +8 (4), +9 (5), +11 (6), +12 (7), +13 (8), +14 (9), +15 (10).</li>
          <li><b>Porte-bonheur :</b> (1) brûler Chance = <b>+2 par pt</b> (double) ; (2) <b>récup +niveau/nuit</b> sans dépasser le max ; (3) peut brûler <b>pour un allié proche et visible</b>, hors initiative, sur tout jet. <b>Un seul porte-bonheur par groupe</b>, même à plusieurs halfelins.</li>
          <li><b>Divers :</b> infravision 9 m. Langues : commun + halfelin +1 / mod. Int. Dé d’action → attaque <i>ou</i> compétence.</li>
        </ul>
        <h3>Table 1-16 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>Att.*</th><th>Critique</th><th>Action</th><th>Réf</th><th>Vig</th><th>Vol</th><th>Discrétion</th></tr>
          <tr><td>1</td><td>+1</td><td>1d8/III</td><td>1d20</td><td>+1</td><td>+1</td><td>+1</td><td>+3</td></tr>
          <tr><td>2</td><td>+2</td><td>1d8/III</td><td>1d20</td><td>+1</td><td>+1</td><td>+1</td><td>+5</td></tr>
          <tr><td>3</td><td>+2</td><td>1d10/III</td><td>1d20</td><td>+2</td><td>+1</td><td>+2</td><td>+7</td></tr>
          <tr><td>4</td><td>+3</td><td>1d10/III</td><td>1d20</td><td>+2</td><td>+2</td><td>+2</td><td>+8</td></tr>
          <tr><td>5</td><td>+4</td><td>1d12/III</td><td>1d20</td><td>+3</td><td>+2</td><td>+3</td><td>+9</td></tr>
          <tr><td>6</td><td>+5</td><td>1d12/III</td><td>1d20+1d14</td><td>+4</td><td>+2</td><td>+4</td><td>+11</td></tr>
          <tr><td>7</td><td>+5</td><td>1d14/III</td><td>1d20+1d16</td><td>+4</td><td>+3</td><td>+4</td><td>+12</td></tr>
          <tr><td>8</td><td>+6</td><td>1d14/III</td><td>1d20+1d20</td><td>+5</td><td>+3</td><td>+5</td><td>+13</td></tr>
          <tr><td>9</td><td>+7</td><td>1d16/III</td><td>1d20+1d20</td><td>+5</td><td>+3</td><td>+5</td><td>+14</td></tr>
          <tr><td>10</td><td>+8</td><td>1d16/III</td><td>1d20+1d20</td><td>+6</td><td>+4</td><td>+6</td><td>+15</td></tr>
        </table></div>
        <div class="note">* À une arme ; à deux armes voir ci-dessus. Titres (niv 1-5) : Vagabond, Explorateur, Collectionneur, Accumulateur, Sage.</div>
    `,
    nain: `
        <h2>7 · Nain <span class="dv">PV : 1d10 / niveau</span></h2>
        <div class="sub">pp. 60-62 · trapu, amoureux de l’or · profondeurs · 6 m de mouvement · infravision 18 m</div>
        <ul>
          <li><b>Profil :</b> exilés, artisans curieux, renégats. Loyaux = émissaires/espions · chaotiques = bannis violents (rares, exil ou mort) · neutres = forgerons/mineurs en voyage d’étude.</li>
          <li><b>Armes :</b> mêlée — dague, épées (2 mains, longue, courte), gourdin, hachette, hache de bataille, lance, marteau, masse ; jet — arbalète, arc court, fronde, javelot. Combinaison favorite <b>arme + bouclier</b>. Meilleure armure possible.</li>
          <li><b>HFA comme le guerrier :</b> pas de bonus fixe ; <b>chaque round</b>, dé HFA ajouté à attaque + dégâts. d3 (1) → d4 → d5 → d6 → d7 (5) → d8 → d10+1 → d10+2 → d10+3 → d10+4 (10).</li>
          <li><b>Hauts faits :</b> comme le guerrier : réussi si <b>dé ≥ 3 + attaque ≥ CA</b> (p. 88).</li>
          <li><b>Épée &amp; bouclier :</b> toujours <b>1 coup de bouclier / round</b> en attaque secondaire : <b>d14 + HFA</b>, 1d3 dmg, haut fait possible. Pointes/bords/enchantements = plus de dégâts. S’ajoute aux dés d’action (même niv 5+).</li>
          <li><b>Talents souterrains :</b> <b>+niveau</b> pour détecter pièges, passages inclinés, murs coulissants… <b>Flair de l’or :</b> direction des masses à 30 m, pièce unique à 12 m avec concentration.</li>
          <li><b>Chance (niv 1) :</b> mod. figé sur <b>1 arme précise</b> (comme guerrier). <b>Langues :</b> commun + nain +1 aléatoire, +1 / mod. Int. Dés d’action → attaque (2ᵉ au niv 5).</li>
        </ul>
        <h3>Table 1-18 · progression complète</h3>
        <div class="table-wrap"><table class="ref">
          <tr><th>Niv</th><th>HFA*</th><th>Critique</th><th>Action**</th><th>Réf</th><th>Vig</th><th>Vol</th></tr>
          <tr><td>1</td><td>+d3</td><td>1d10/III</td><td>1d20</td><td>+1</td><td>+1</td><td>+1</td></tr>
          <tr><td>2</td><td>+d4</td><td>1d12/III</td><td>1d20</td><td>+1</td><td>+1</td><td>+1</td></tr>
          <tr><td>3</td><td>+d5</td><td>1d14/III</td><td>1d20</td><td>+1</td><td>+2</td><td>+1</td></tr>
          <tr><td>4</td><td>+d6</td><td>1d16/IV</td><td>1d20</td><td>+2</td><td>+2</td><td>+2</td></tr>
          <tr><td>5</td><td>+d7</td><td>1d20/IV</td><td>1d20+1d14</td><td>+2</td><td>+3</td><td>+2</td></tr>
          <tr><td>6</td><td>+d8</td><td>1d24/V</td><td>1d20+1d16</td><td>+2</td><td>+4</td><td>+2</td></tr>
          <tr><td>7</td><td>+d10+1</td><td>1d30/V</td><td>1d20+1d20</td><td>+3</td><td>+4</td><td>+3</td></tr>
          <tr><td>8</td><td>+d10+2</td><td>1d30/V</td><td>1d20+1d20</td><td>+3</td><td>+5</td><td>+3</td></tr>
          <tr><td>9</td><td>+d10+3</td><td>2d20/V</td><td>1d20+1d20</td><td>+3</td><td>+5</td><td>+3</td></tr>
          <tr><td>10</td><td>+d10+4</td><td>2d20/V</td><td>1d20+1d20+1d14</td><td>+4</td><td>+6</td><td>+4</td></tr>
        </table></div>
        <div class="note">* Relancé chaque round (attaque + dégâts). ** + 1 coup de bouclier au d14 à chaque round. Titres (niv 1-5) : Loyal Agent→Ambassadeur · Chaotique Rebelle→Renégat · Neutre Apprenti→Thegn.</div>
    `
  };

  var foot = `
      Source : DCC Édition française, pp. 18, 21-24 et 28-62 (Table 1-1 : p. 18 · Niveau 0 : 21-24 · Clerc 28-32 · Guerrier 34-36 · Mage 40-42 · Voleur 44-48 · Elfe 52-54 · Halfelin 56-58 · Nain 60-62). V4 = référence complète sans limite de place. Le livre reste la référence (sorts ch. 5, tables de critique, magie mercurielle).
    `;

  window.DCC_CLASS_HELP = {
    order: ['intro', 'carac', 'niveau0', 'clerc', 'guerrier', 'mage',
      'voleur', 'elfe', 'halfelin', 'nain'],
    toc: [['carac', 'Table 1-1'], ['niveau0', 'Niveau 0'],
      ['clerc', 'Clerc'], ['guerrier', 'Guerrier'], ['mage', 'Mage'],
      ['voleur', 'Voleur'], ['elfe', 'Elfe'], ['halfelin', 'Halfelin'],
      ['nain', 'Nain']],
    labels: { niveau0: 'Niveau 0', clerc: 'Clerc', elfe: 'Elfe',
      guerrier: 'Guerrier', halfelin: 'Halfelin', mage: 'Mage',
      nain: 'Nain', voleur: 'Voleur', lvl0: 'Niveau 0' },
    classOf: { lvl0: 'niveau0', clerc: 'clerc', elfe: 'elfe',
      guerrier: 'guerrier', halfelin: 'halfelin', mage: 'mage',
      nain: 'nain', voleur: 'voleur' },
    sections: sections,
    foot: foot,
  };
})();
